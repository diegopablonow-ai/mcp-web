/**
 * Input validation schemas for auth and billing routes.
 *
 * Uses zod (already listed in package.json as a dependency).
 */

import { z } from "zod"

export type AuthBody = z.infer<typeof AuthBodySchema>
export type CheckoutBody = z.infer<typeof CheckoutBodySchema>

export const AuthBodySchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .max(254, "Email too long.")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
})

export const CheckoutBodySchema = z
  .object({
    plan: z.string().max(64).optional(),
    extraQuota: z.number().int().min(1, "extraQuota must be at least 1.").max(100_000, "extraQuota too large.").optional(),
  })
  .refine((b) => b.plan !== undefined || b.extraQuota !== undefined, {
    message: "Either plan or extraQuota is required.",
  })
