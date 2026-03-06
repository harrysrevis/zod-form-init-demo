import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildRHFDefaultValues, buildMantineInitialValues } from "./buildInitValues";

// ─── Primitives ───────────────────────────────────────────────────────────────

describe("primitives — no explicit default", () => {
  it("string → empty string", () => {
    const s = z.object({ x: z.string() });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "" });
  });

  it("number → 0", () => {
    const s = z.object({ x: z.number() });
    expect(buildRHFDefaultValues(s)).toEqual({ x: 0 });
  });

  it("boolean → false", () => {
    const s = z.object({ x: z.boolean() });
    expect(buildRHFDefaultValues(s)).toEqual({ x: false });
  });

  it("date → null", () => {
    const s = z.object({ x: z.date() });
    expect(buildRHFDefaultValues(s)).toEqual({ x: null });
  });

  it("array → []", () => {
    const s = z.object({ x: z.array(z.string()) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: [] });
  });
});

// ─── z.default() ──────────────────────────────────────────────────────────────

describe("z.default()", () => {
  it("string default", () => {
    const s = z.object({ x: z.string().default("hello") });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "hello" });
  });

  it("number default", () => {
    const s = z.object({ x: z.number().default(42) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: 42 });
  });

  it("boolean default", () => {
    const s = z.object({ x: z.boolean().default(true) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: true });
  });

  it("array default", () => {
    const s = z.object({ x: z.array(z.string()).default(["a", "b"]) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: ["a", "b"] });
  });

  it("lazy (function) default", () => {
    const s = z.object({ x: z.array(z.string()).default(() => ["lazy"]) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: ["lazy"] });
  });
});

// ─── z.optional() ─────────────────────────────────────────────────────────────

describe("z.optional()", () => {
  it("omitted by default (includeOptional: false)", () => {
    const s = z.object({ x: z.string().optional() });
    expect(buildRHFDefaultValues(s)).toEqual({});
  });

  it("included when includeOptional: true", () => {
    const s = z.object({ x: z.string().optional() });
    expect(buildRHFDefaultValues(s, { includeOptional: true })).toEqual({ x: "" });
  });

  it("optional with default is always included", () => {
    const s = z.object({ x: z.string().default("hi").optional() });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "hi" });
    expect(buildRHFDefaultValues(s, { includeOptional: false })).toEqual({ x: "hi" });
  });
});

// ─── z.nullable() ─────────────────────────────────────────────────────────────

describe("z.nullable()", () => {
  it("defaults to null", () => {
    const s = z.object({ x: z.string().nullable() });
    expect(buildRHFDefaultValues(s)).toEqual({ x: null });
  });

  it("nullable with default uses the default", () => {
    const s = z.object({ x: z.string().nullable().default("fallback") });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "fallback" });
  });
});

// ─── Enums & Literals ─────────────────────────────────────────────────────────

describe("z.enum()", () => {
  it("picks first option", () => {
    const s = z.object({ x: z.enum(["a", "b", "c"]) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "a" });
  });

  it("z.default() on enum wins", () => {
    const s = z.object({ x: z.enum(["a", "b", "c"]).default("b") });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "b" });
  });
});

describe("z.literal()", () => {
  it("returns the literal value", () => {
    const s = z.object({ x: z.literal("foo") });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "foo" });
  });
});

// ─── z.union() ────────────────────────────────────────────────────────────────

describe("z.union()", () => {
  it("picks default of first variant", () => {
    const s = z.object({ x: z.union([z.literal("email"), z.literal("phone")]) });
    expect(buildRHFDefaultValues(s)).toEqual({ x: "email" });
  });

  it("union of objects picks first object's defaults", () => {
    const s = z.object({
      x: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
    });
    expect(buildRHFDefaultValues(s)).toEqual({ x: { a: "" } });
  });
});

// ─── Nested objects ───────────────────────────────────────────────────────────

describe("nested z.object()", () => {
  it("recurses into nested objects", () => {
    const s = z.object({
      address: z.object({
        line1: z.string().default(""),
        city: z.string().default(""),
      }),
    });
    expect(buildRHFDefaultValues(s)).toEqual({ address: { line1: "", city: "" } });
  });

  it("optional nested object omitted by default", () => {
    const s = z.object({
      meta: z.object({ x: z.string() }).optional(),
    });
    expect(buildRHFDefaultValues(s)).toEqual({});
  });

  it("optional nested object included when includeOptional: true", () => {
    const s = z.object({
      meta: z.object({ x: z.string() }).optional(),
    });
    expect(buildRHFDefaultValues(s, { includeOptional: true })).toEqual({ meta: { x: "" } });
  });
});

// ─── perType fallbacks ────────────────────────────────────────────────────────

describe("perType fallbacks", () => {
  it("overrides primitive defaults", () => {
    const s = z.object({ x: z.string(), n: z.number(), b: z.boolean() });
    expect(buildRHFDefaultValues(s, { perType: { string: "N/A", number: -1, boolean: true } }))
      .toEqual({ x: "N/A", n: -1, b: true });
  });

  it("overrides array default", () => {
    const s = z.object({ x: z.array(z.string()) });
    expect(buildRHFDefaultValues(s, { perType: { array: ["default"] } }))
      .toEqual({ x: ["default"] });
  });

  it("perType does not override z.default()", () => {
    const s = z.object({ x: z.string().default("explicit") });
    expect(buildRHFDefaultValues(s, { perType: { string: "fallback" } }))
      .toEqual({ x: "explicit" });
  });
});

// ─── overrides ────────────────────────────────────────────────────────────────

describe("overrides", () => {
  it("string override", () => {
    const s = z.object({ name: z.string() });
    expect(buildRHFDefaultValues(s, { overrides: { name: "Harry" } })).toEqual({ name: "Harry" });
  });

  it("null override (explicit null wins)", () => {
    const s = z.object({ x: z.string().nullable().default("value") });
    expect(buildRHFDefaultValues(s, { overrides: { x: null } })).toEqual({ x: null });
  });

  it("undefined override is a no-op (keeps base)", () => {
    const s = z.object({ x: z.string().default("base") });
    expect(buildRHFDefaultValues(s, { overrides: { x: undefined } })).toEqual({ x: "base" });
  });

  it("arrays are replaced, not merged", () => {
    const s = z.object({ tags: z.array(z.string()).default(["a", "b"]) });
    expect(buildRHFDefaultValues(s, { overrides: { tags: ["x"] } })).toEqual({ tags: ["x"] });
  });

  it("objects are deep merged", () => {
    const s = z.object({
      address: z.object({ line1: z.string().default(""), city: z.string().default("Athens") }),
    });
    expect(buildRHFDefaultValues(s, { overrides: { address: { line1: "123 Main St" } } }))
      .toEqual({ address: { line1: "123 Main St", city: "Athens" } });
  });
});

// ─── ProfileSchema (real-world) ───────────────────────────────────────────────

const ProfileSchema = z.object({
  name: z.string().min(2),
  email: z.email().default(""),
  age: z.number().int().min(0).optional(),
  marketingOptIn: z.boolean().default(false),
  address: z.object({
    line1: z.string().default(""),
    city: z.string().default(""),
    postcode: z.string().default(""),
    country: z.enum(["GR", "UK", "DE"]).default("GR"),
  }),
  tags: z.array(z.string()).default([]),
  contactMethod: z.union([z.literal("email"), z.literal("phone")]),
  notes: z.string().default("N/A").optional(),
  birthday: z.date().nullable(),
});

describe("ProfileSchema defaults", () => {
  it("produces correct defaults with includeOptional: false", () => {
    const result = buildRHFDefaultValues(ProfileSchema);
    expect(result).toEqual({
      name: "",
      email: "",
      marketingOptIn: false,
      address: { line1: "", city: "", postcode: "", country: "GR" },
      tags: [],
      contactMethod: "email",
      notes: "N/A",   // optional but has a default → always included
      birthday: null,
    });
    // age omitted (optional, no default)
    expect(result).not.toHaveProperty("age");
  });

  it("includes age when includeOptional: true", () => {
    const result = buildRHFDefaultValues(ProfileSchema, { includeOptional: true });
    expect(result).toHaveProperty("age", 0);
  });

  it("applies overrides on top of defaults", () => {
    const result = buildRHFDefaultValues(ProfileSchema, {
      overrides: {
        name: "Harry",
        email: "hrevisios@gmail.com",
        tags: ["aws", "react"],
        address: { city: "Athens" },
      },
    });
    expect(result).toMatchObject({
      name: "Harry",
      email: "hrevisios@gmail.com",
      tags: ["aws", "react"],
      address: { line1: "", city: "Athens", postcode: "", country: "GR" },
    });
  });
});

// ─── Adapters ─────────────────────────────────────────────────────────────────

describe("buildMantineInitialValues", () => {
  it("returns same shape as RHF adapter for basic schema", () => {
    const s = z.object({ name: z.string().default(""), age: z.number().default(0) });
    expect(buildMantineInitialValues(s)).toEqual({ name: "", age: 0 });
  });

  it("respects includeOptional", () => {
    const s = z.object({ x: z.string().optional() });
    expect(buildMantineInitialValues(s, { includeOptional: true })).toEqual({ x: "" });
    expect(buildMantineInitialValues(s, { includeOptional: false })).toEqual({});
  });
});
