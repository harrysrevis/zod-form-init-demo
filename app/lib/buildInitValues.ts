import type { DefaultValues } from "react-hook-form";
import { z } from "zod";

/**
 * Fallback values used when a schema doesn't declare an explicit default via z.default().
 * These are form-friendly "empty" values.
 */
type PerTypeDefaults = {
  string?: string;
  number?: number;
  boolean?: boolean;
  array?: unknown[];
  date?: Date | null;
};

/**
 * A deep partial type for overrides:
 * - Keeps Date as-is
 * - Recurses into objects and arrays
 *
 * Useful because form defaults are often partial, especially for nested objects.
 */
type DeepPartial<T> = T extends Date
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

/**
 * Options controlling how default values are generated.
 *
 * includeOptional
 * - false (default): optional keys without defaults are omitted from the output object
 * - true: optional keys are included using either their default or a perType fallback
 *
 * perType
 * - fallback defaults for primitive-ish types when no z.default() exists
 *
 * overrides
 * - deep partial overrides applied after defaults are generated
 * - override values always win (including null), while undefined means "do not override"
 */
type BuildOptions<T> = {
  includeOptional?: boolean;
  perType?: PerTypeDefaults;
  overrides?: DeepPartial<T>;
};

/**
 * Zod has internal "def" shapes that differ across major versions:
 * - Zod v4: schema._zod.def
 * - Zod v3: schema._def
 *
 * Zod internals are not part of the public API, so we model them as unknown and
 * keep access narrow and defensive.
 */
type ZodInternalDef = {
  schema?: unknown;
  innerType?: unknown;
  inner?: unknown;
  in?: unknown;
  out?: unknown;
  options?: unknown[];
  defaultValue?: unknown | (() => unknown);
};

type AnyZodObject = z.ZodObject<z.ZodRawShape>;

/**
 * Type guard for filtering out null/undefined in arrays.
 */
function isDefined<T>(v: T | undefined | null): v is T {
  return v != null;
}

/**
 * Retrieve the internal Zod "def" object in a version-tolerant way.
 * Returns an empty object if no internal def is present.
 */
function getDef(schema: unknown): ZodInternalDef {
  const s = schema as {
    _zod?: { def?: ZodInternalDef };
    _def?: ZodInternalDef;
  };
  return s?._zod?.def ?? s?._def ?? {};
}

/**
 * Read the default value from a ZodDefault wrapper (z.default()).
 * Zod stores defaults either as:
 * - a literal value, or
 * - a function returning the value (lazy default)
 */
function readDefault(schema: unknown): unknown {
  const dv = getDef(schema).defaultValue;
  return typeof dv === "function" ? dv() : dv;
}

/**
 * Best-effort runtime test to detect a Zod schema.
 * We treat any object with a callable parse() as a schema.
 *
 * This is intentionally permissive because we are traversing Zod internals.
 */
function asSchema(x: unknown): z.ZodType | undefined {
  if (!x || typeof x !== "object") return undefined;

  const obj = x as Record<string, unknown>;
  if (!("parse" in obj)) return undefined;

  const parse = obj.parse;
  return typeof parse === "function" ? (x as z.ZodType) : undefined;
}

/**
 * Unwrap "wrapper" schemas (effects/transforms/pipes) so we can reason about base types.
 *
 * Important: we STOP at Optional/Nullable/Default wrappers because they affect the output:
 * - Optional: may be omitted from the output
 * - Nullable: should default to null (unless explicit default exists)
 * - Default: should return the declared default
 *
 * The loop is capped to prevent infinite traversal if internals change unexpectedly.
 */
function unwrap(s: z.ZodType): z.ZodType {
  for (let i = 0; i < 10; i++) {
    if (
      s instanceof z.ZodOptional ||
      s instanceof z.ZodNullable ||
      s instanceof z.ZodDefault
    ) {
      break;
    }

    const def = getDef(s);
    // Different Zod schema wrappers store their inner schema under different fields.
    // We probe a few common ones.
    const next =
      asSchema(def.schema) ??
      asSchema(def.innerType) ??
      asSchema(def.inner) ??
      asSchema(def.in) ??
      asSchema(def.out);

    // Stop if we can't unwrap further, or if nothing changed.
    if (!next || next === s) break;
    s = next;
  }
  return s;
}

/**
 * True only for plain object literals (not arrays, not Date, not class instances).
 * Used to decide when to recursively merge vs replace.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/**
 * Detect whether a schema branch declares an explicit z.default().
 * This is used to prioritize union members that encode an intentional default.
 */
function hasExplicitDefault(schema: z.ZodType): boolean {
  schema = unwrap(schema);

  if (schema instanceof z.ZodDefault) return true;

  if (schema instanceof z.ZodOptional) {
    const inner = asSchema(getDef(schema).innerType);
    return inner ? hasExplicitDefault(inner) : false;
  }

  return false;
}

/**
 * Score a resolved default value so unions can prefer richer, form-friendly branches.
 * Higher is better.
 */
function scoreResolvedValue(value: unknown): number {
  if (value === undefined) return -1;
  if (value === null) return 0;

  if (isPlainObject(value)) {
    const entries = Object.values(value as Record<string, unknown>).filter(
      (entry): entry is unknown => entry !== undefined,
    );
    const nestedScore = entries.reduce<number>(
      (sum, entry) => sum + scoreResolvedValue(entry),
      0,
    );
    return 10 + entries.length * 5 + nestedScore;
  }

  if (Array.isArray(value)) {
    return value.reduce<number>(
      (sum, entry) => sum + scoreResolvedValue(entry),
      2,
    );
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return 2;
  }

  return 1;
}

/**
 * Choose the strongest union candidate:
 * 1) explicit z.default() wins
 * 2) defined values beat undefined
 * 3) richer resolved values beat emptier ones
 * 4) declaration order breaks ties
 */
function resolveUnionDefault(
  options: z.ZodType[],
  perType?: PerTypeDefaults,
  includeOptional = false,
): unknown {
  let best:
    | {
        value: unknown;
        explicitDefault: boolean;
        score: number;
        index: number;
      }
    | undefined;

  for (const [index, option] of options.entries()) {
    const value = defaultForSchema(option, perType, includeOptional);
    const candidate = {
      value,
      explicitDefault: hasExplicitDefault(option),
      score: scoreResolvedValue(value),
      index,
    };

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.explicitDefault !== best.explicitDefault) {
      if (candidate.explicitDefault) best = candidate;
      continue;
    }

    if (candidate.score !== best.score) {
      if (candidate.score > best.score) best = candidate;
      continue;
    }

    if (candidate.index < best.index) best = candidate;
  }

  return best?.value;
}

/**
 * Generate a best-effort default value for a given Zod schema.
 *
 * Resolution order:
 * 1) explicit z.default() always wins
 * 2) optional keys:
 *    - if includeOptional=false: omit unless the inner type has an explicit default
 *    - if includeOptional=true: include using the inner default (or fallbacks)
 * 3) nullable defaults to null
 * 4) objects recurse through shape
 * 5) primitives/arrays/enums/literals/unions get sensible defaults
 *
 * Returns unknown because the function is dynamic across schema types.
 */
function defaultForSchema(
  schema: z.ZodType,
  perType?: PerTypeDefaults,
  includeOptional = false,
): unknown {
  // Peel transforms/pipes/etc. so we work with the core schema.
  schema = unwrap(schema);

  // If the schema has an explicit z.default(...), always use it.
  if (schema instanceof z.ZodDefault) return readDefault(schema);

  // Optional handling:
  // - If includeOptional=false, we usually omit the key (return undefined)
  // - Exception: if the *inner schema* has a default, we still apply it (matches Zod v4 behavior)
  if (schema instanceof z.ZodOptional) {
    const inner = asSchema(getDef(schema).innerType);

    // Optional(default(...)) => apply the default even if includeOptional=false
    if (inner instanceof z.ZodDefault)
      return defaultForSchema(inner, perType, includeOptional);

    if (!includeOptional) return undefined;
    return inner
      ? defaultForSchema(inner, perType, includeOptional)
      : undefined;
  }

  // Nullable schemas default to null (unless overridden by z.default()).
  if (schema instanceof z.ZodNullable) return null;

  // Objects: build a default object by computing each field default.
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const out: Record<string, unknown> = {};

    for (const k of Object.keys(shape)) {
      const field = shape[k];

      // Determine if we should include this key when includeOptional=false.
      const isOptional = field instanceof z.ZodOptional;
      const inner = isOptional ? asSchema(getDef(field).innerType) : undefined;
      const hasDefault =
        field instanceof z.ZodDefault || inner instanceof z.ZodDefault;

      // Skip optional fields without defaults unless includeOptional=true.
      if (!includeOptional && isOptional && !hasDefault) continue;

      out[k] = defaultForSchema(field, perType, includeOptional);
    }
    return out;
  }

  // Arrays default to [] (or perType override).
  if (schema instanceof z.ZodArray) return perType?.array ?? [];

  // Enum: pick the first option as a stable default (or fallback string).
  if (schema instanceof z.ZodEnum)
    return schema.options[0] ?? perType?.string ?? "";

  // Literal: the only valid value is the literal itself.
  if (schema instanceof z.ZodLiteral) return schema.value;

  // Union: rank all options so explicit defaults and richer resolved values win.
  if (schema instanceof z.ZodUnion) {
    const options = (getDef(schema).options ?? [])
      .map(asSchema)
      .filter(isDefined);

    return resolveUnionDefault(options, perType, includeOptional);
  }

  // Primitive fallbacks.
  if (schema instanceof z.ZodString) return perType?.string ?? "";
  if (schema instanceof z.ZodNumber) return perType?.number ?? 0;
  if (schema instanceof z.ZodBoolean) return perType?.boolean ?? false;
  if (schema instanceof z.ZodDate) return perType?.date ?? null;

  // Unknown schema types (e.g. z.any(), z.unknown(), records, maps, sets, etc.)
  // return undefined and let the UI/form layer decide.
  return undefined;
}

/**
 * Deep-merge overrides on top of base defaults.
 *
 * Rules:
 * - overrides === undefined: do not override at all (keep base)
 * - arrays: replaced (not merged)
 * - plain objects: merged recursively key-by-key
 * - primitives and non-plain objects (Date): replaced
 *
 * This matches typical form expectations: arrays are treated as atomic values.
 */
function deepMerge(base: unknown, overrides: unknown): unknown {
  // Explicit undefined means "no override".
  if (overrides === undefined) return base;

  // Arrays: override wins (common for form values).
  if (Array.isArray(base) || Array.isArray(overrides)) return overrides ?? base;

  // Plain objects: merge key-by-key recursively.
  if (isPlainObject(base) && isPlainObject(overrides)) {
    const out = { ...(base as Record<string, unknown>) } as Record<
      string,
      unknown
    >;
    for (const k of Object.keys(overrides)) {
      const ov = (overrides as Record<string, unknown>)[k];
      if (ov === undefined) continue;

      const bv = (base as Record<string, unknown>)[k];
      out[k] = deepMerge(bv, ov);
    }
    return out;
  }

  // Everything else: override replaces base (including null).
  return overrides;
}

/**
 * Core builder used by framework-specific adapters.
 * Returns unknown because each consumer wants a different typing contract.
 */
function buildInitValuesCore(
  schema: AnyZodObject,
  options: BuildOptions<Record<string, unknown>> = {},
): unknown {
  const { includeOptional = false, perType, overrides } = options;
  const base = defaultForSchema(schema, perType, includeOptional);
  return overrides ? deepMerge(base, overrides) : base;
}

/**
 * Mantine adapter:
 * Mantine's `initialValues` is typically treated as a stable, fully-shaped object.
 *
 * Note:
 * - We do not force includeOptional here. You control it via options.
 * - If you want Mantine to always render every field, pass includeOptional: true.
 */
export function buildMantineInitialValues<TSchema extends AnyZodObject>(
  schema: TSchema,
  options: BuildOptions<z.output<TSchema>> = {},
): z.output<TSchema> {
  const value = buildInitValuesCore(
    schema,
    options as BuildOptions<Record<string, unknown>>,
  );
  return value as z.output<TSchema>;
}

/**
 * React Hook Form adapter:
 * RHF `defaultValues` is a DeepPartial by design.
 *
 * We return DefaultValues<z.input<TSchema>> (not output) because:
 * - RHF defaultValues represent raw input values
 * - Zod output types may include transformations/defaulted fields that do not exist in raw input
 */
export function buildRHFDefaultValues<TSchema extends AnyZodObject>(
  schema: TSchema,
  options: BuildOptions<z.output<TSchema>> = {},
): DefaultValues<z.input<TSchema>> {
  const value = buildInitValuesCore(
    schema,
    options as BuildOptions<Record<string, unknown>>,
  );
  return value as DefaultValues<z.input<TSchema>>;
}
