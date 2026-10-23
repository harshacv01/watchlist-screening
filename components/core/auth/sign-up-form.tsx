"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { resendSignUpCode, signUp } from "aws-amplify/auth"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { markCodeSent } from "@/hooks/use-resend-cooldown"

import { AuthHeader } from "./auth-header"
import { signUpSchema, verifyEmailHref, type SignUpValues } from "./schemas"

export function SignUpForm() {
  const router = useRouter()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    clearErrors,
    watch,
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  const serverError = errors.root?.serverError

  const clearServerError = () => clearErrors("root.serverError")

  const { email, password, confirmPassword } = watch()

  // Cognito also throws UsernameExistsException for accounts that signed up but never verified.
  // Resending tells the two apart: it succeeds only for unverified accounts.
  async function handleExistingAccount(email: string) {
    try {
      await resendSignUpCode({ username: email })
      markCodeSent(email)
      toast.info("This email isn't verified yet. We've sent you a new code.")
      router.push(verifyEmailHref(email))
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      if (name !== "InvalidParameterException") {
        // InvalidParameterException means the account is already verified
        console.error("Cognito resend code error:", error)
      }
      setError("email", {
        type: "server",
        message: "An account with this email already exists. Please sign in.",
      })
    }
  }

  async function onSubmit(values: SignUpValues) {
    try {
      const result = await signUp({
        username: values.email,
        password: values.password,
        options: { userAttributes: { email: values.email } },
      })

      console.log("Next signup step:", result.nextStep)
      markCodeSent(values.email)
      router.push(verifyEmailHref(values.email))
    } catch (error) {
      const name = error instanceof Error ? error.name : ""

      switch (name) {
        case "UsernameExistsException":
          await handleExistingAccount(values.email)
          break
        case "InvalidPasswordException":
          setError("password", {
            type: "server",
            message: "Password does not meet the requirements",
          })
          break
        case "LimitExceededException":
        case "TooManyRequestsException":
          setError("root.serverError", {
            type: "server",
            message: "Too many attempts. Please try again later.",
          })
          break
        default:
          console.error("Cognito sign-up error:", error)
          setError("root.serverError", {
            type: "server",
            message: "Something went wrong. Please try again.",
          })
      }
    }
  }

  return (
    // The card and background image come from app/(auth)/layout.tsx
    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <AuthHeader
          title="Create your account"
          description="Enter your email below to create your account"
        />
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email", { onChange: clearServerError })}
          />
          <FieldError id="email-error">{errors.email?.message}</FieldError>
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password", {
              onChange: clearServerError,
              deps: ["confirmPassword"],
            })}
          />
          <FieldError id="password-error">
            {errors.password?.message}
          </FieldError>
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            {...register("confirmPassword")}
          />
          <FieldError id="confirm-password-error">
            {errors.confirmPassword?.message}
          </FieldError>
        </Field>
        <Field>
          <FieldError role="alert">{serverError?.message}</FieldError>
          <Button
            type="submit"
            disabled={isSubmitting || !email || !password || !confirmPassword}
          >
            Create Account
            {isSubmitting ? (
              <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />
            ) : null}
          </Button>
        </Field>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
          Or continue with
        </FieldSeparator>
        <FieldDescription className="text-center">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline underline-offset-4">
            Sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
