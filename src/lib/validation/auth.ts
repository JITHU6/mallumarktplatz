import { z } from "zod";

export const PASSWORD_MIN = 8;

export const loginSchema = z.object({
  email: z.email({ message: "invalidEmail" }).trim(),
  password: z.string().min(1, { message: "required" }),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, { message: "required" }).max(120, { message: "tooLong" }),
  email: z.email({ message: "invalidEmail" }).trim(),
  password: z.string().min(PASSWORD_MIN, { message: "passwordTooShort" }).max(72, { message: "tooLong" }),
  acceptTerms: z.literal("on", { message: "termsRequired" }),
});

export const emailSchema = z.object({ email: z.email({ message: "invalidEmail" }).trim() });

export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN, { message: "passwordTooShort" }).max(72, { message: "tooLong" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "passwordsDoNotMatch", path: ["confirmPassword"] });

/** Only allow same-origin relative redirects. */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
