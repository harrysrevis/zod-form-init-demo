import { z } from "zod"

export const ProfileSchema = z.object({
  name: z.string().min(2),
  email: z.email().default(""),
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
})

export type Profile = z.output<typeof ProfileSchema>

export type ProfileInput = z.input<typeof ProfileSchema>