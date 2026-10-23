"use client"

import Link from "next/link"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { AuthHeader } from "./auth-header"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import z from "zod"
import { Spinner } from "@/components/ui/spinner"
import { resendSignUpCode, resetPassword } from "aws-amplify/auth"
import { emailField, verifyEmailHref } from "./schemas"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { markCodeSent } from "@/hooks/use-resend-cooldown"

const resetPasswordSchema = z.object({
  email: emailField,
})

const ResetPasswordForm = () => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    clearErrors,
    watch,
  } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  })

  const email = watch("email")

  const router = useRouter()

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    try {
      const { nextStep } = await resetPassword({ username: values.email })

      if (nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        markCodeSent(values.email, "reset")
        router.push(
          `/confirm-reset-password?email=${encodeURIComponent(values.email)}`
        )
      }
    } catch (error) {
      console.error("Cognito reset password error:", error)
      const name = error instanceof Error ? error.name : ""

      switch (name) {
        case "UserNotFoundException":
          setError("email", {
            type: "manual",
            message: "No account found with that email",
          })
          break
        case "InvalidParameterException":
          // The account's email was never verified, so Cognito has nowhere to send a reset code.
          // Verify the email first; the verify page has its own Resend button if this send fails.
          try {
            await resendSignUpCode({ username: values.email })
            markCodeSent(values.email, "verify")
          } catch (resendError) {
            console.error("Cognito resend code error:", resendError)
          }
          toast.info("Please verify your email first. We've sent you a code.")
          router.push(verifyEmailHref(values.email))
          break
        case "LimitExceededException":
          setError("email", {
            type: "manual",
            message:
              "Too many attempts. Please try again later or contact support.",
          })
          break
        default:
          setError("email", {
            type: "manual",
            message: "An unexpected error occurred. Please try again.",
          })
      }
    }
  }

  return (
    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <AuthHeader
          title="Reset Password"
          description="Enter your email below to reset your password"
        />
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            {...register("email")}
            type="email"
            placeholder="m@example.com"
            aria-invalid={!!errors.email}
          />

          <FieldError>{errors.email?.message}</FieldError>
        </Field>

        <Button
          className="w-full"
          disabled={!email || isSubmitting}
          type="submit"
        >
          Send Code
          {isSubmitting && (
            <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <FieldDescription className="text-center">
          <Link href="/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}

export default ResetPasswordForm
