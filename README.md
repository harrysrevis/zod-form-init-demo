# Zod Form Init Demo

A small utility that generates form default values directly from a Zod schema.

This demo showcases how to:

- Derive default values from Zod object schemas
- Respect `z.default()`
- Handle optional and nullable fields
- Apply deep overrides
- Integrate seamlessly with React Hook Form
- Keep types aligned between Zod and form state

The goal is to eliminate repetitive form initialization logic while keeping type safety intact.

---

## Live Demo

🔗 **https://zod-form-init-demo.vercel.app**

---

## Why This Exists

When building forms with:

- Zod schemas
- React Hook Form
- Nested objects
- Optional fields
- Defaults
- Arrays and unions

You often end up manually constructing large `defaultValues` objects that drift out of sync with the schema.

This utility derives them automatically from the schema itself.

---

## Features

- Supports nested Zod objects
- Respects `z.default()`
- Handles optional fields with configurable behavior
- Nullable → defaults to `null`
- Arrays → default to `[]`
- Enums → default to first option
- Deep merge overrides
- React Hook Form adapter
- Mantine adapter

---

## Example Schema

```ts
import { z } from "zod";

export const ProfileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().default(""),
  age: z.number().int().min(0).optional(),
  marketingOptIn: z.boolean().default(false),

  address: z.object({
    line1: z.string().default(""),
    city: z.string().default(""),
    postcode: z.string().optional(),
    country: z.enum(["GR", "UK", "DE"]).default("GR"),
  }),

  tags: z.array(z.string()).default([]),
  contactMethod: z.union([z.literal("email"), z.literal("phone")]),
  notes: z.string().default("N/A").optional(),
  birthday: z.date().nullable(),
});
```

---

## Generate React Hook Form Default Values

```ts
import { buildRHFDefaultValues } from "./lib/buildInitValues";

const defaultValues = buildRHFDefaultValues(ProfileSchema, {
  includeOptional: false,
  overrides: {
    name: "Harry",
    tags: ["aws", "nextjs"],
  },
});
```

Then:

```ts
const form = useForm<z.input<typeof ProfileSchema>>({
  resolver: zodResolver(ProfileSchema),
  defaultValues,
});
```

---

## Configuration Options

```ts
type BuildOptions<T> = {
  includeOptional?: boolean;
  perType?: {
    string?: string;
    number?: number;
    boolean?: boolean;
    array?: unknown[];
    date?: Date | null;
  };
  overrides?: DeepPartial<T>;
};
```

### includeOptional

- `false` → optional keys without defaults are omitted  
- `true` → optional keys are included using fallback values  

---

## What This Utility Handles

- Nested objects
- Optional + default combinations
- Nullable values
- Arrays
- Enums
- Literal unions
- Deep override merging

---

## What It Does NOT Handle (Yet)

- Discriminated unions
- Records
- Maps / Sets
- Tuples
- Complex transformation chains
- Schema transforms that alter output structure

The scope is intentionally focused on common form schemas.

---

## Running the Demo Locally

```bash
yarn install
yarn dev
```

Open:

```
http://localhost:3000
```

---

## Tech Stack

- Next.js (App Router)
- React Hook Form
- Zod
- Tailwind CSS

---

## Roadmap

- Improve union default resolution strategy
- Add support for discriminated unions
- Extract into standalone npm package
- Add full test coverage

---

## About Me

Hey, I'm Harry.

I built this utility to simplify form initialization by deriving default values directly from Zod schemas without repetitive boilerplate or type mismatches.

🔗 LinkedIn: https://www.linkedin.com/in/harry-revisios/  
📧 Email: hrevisios@gmail.com

---

## License

MIT