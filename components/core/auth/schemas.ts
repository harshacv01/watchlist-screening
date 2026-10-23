import { z } from "zod"

export const emailField = z
  .string()
  .trim()
  .min(1, { error: "Email is required" })
  .pipe(z.email({ error: "Enter a valid email address" }))

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Password is required" }),
})

// Shared by sign-up and password reset so both enforce the same rules
const newPasswordField = z.string().min(8, {
  error: "Password must be at least 8 characters",
})

const confirmPasswordField = z
  .string()
  .min(1, { error: "Please confirm your password" })

export const signUpSchema = z
  .object({
    email: emailField,
    password: newPasswordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const confirmResetPasswordSchema = z
  .object({
    code: z
      .string()
      .length(6, { error: "Code must be 6 digits" })
      .regex(/^\d+$/, { error: "Code must contain only digits" }),
    newPassword: newPasswordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ConfirmResetPasswordValues = z.infer<
  typeof confirmResetPasswordSchema
>

export function verifyEmailHref(email: string) {
  return `/verify-email?email=${encodeURIComponent(email)}`
}
