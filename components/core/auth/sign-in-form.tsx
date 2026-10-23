"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { resendSignUpCode, signIn } from "aws-amplify/auth"

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
import { signInSchema, verifyEmailHref, type SignInValues } from "./schemas"

export function SignInForm() {
  const router = useRouter()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    clearErrors,
    watch,
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  })

  const serverError = errors.root?.serverError
  // Only wrong-credential errors should turn both inputs red
  const credentialsInvalid = serverError?.type === "credentials"

  const clearServerError = () => clearErrors("root.serverError")

  const { email, password } = watch()

  // The account exists but was never verified: send a fresh code, then open the verify page.
  // The verify page has its own Resend button, so a failed send here isn't a dead end.
  async function continueToVerify(email: string) {
    try {
      await resendSignUpCode({ username: email })
      markCodeSent(email)
    } catch (error) {
      console.error("Cognito resend code error:", error)
    }
    router.push(verifyEmailHref(email))
  }

  async function onSubmit(values: SignInValues) {
    try {
      const result = await signIn({
        username: values.email,
        password: values.password,
      })

      if (result.isSignedIn) {
        router.push("/dashboard")
        router.refresh()
      } else if (result.nextStep.signInStep === "CONFIRM_SIGN_UP") {
        await continueToVerify(values.email)
      } else {
        console.log("Next login step:", result.nextStep)
        // Handle MFA, password change, etc.
      }
    } catch (error) {
      const name = error instanceof Error ? error.name : ""

      switch (name) {
        case "UserNotFoundException":
        case "NotAuthorizedException":
          // Same message for both so you don't reveal which emails are registered
          setError("root.serverError", {
            type: "credentials",
            message: "Incorrect email or password",
          })
          break
        case "UserNotConfirmedException":
          await continueToVerify(values.email)
          break
        case "UserAlreadyAuthenticatedException":
          router.push("/dashboard")
          router.refresh()
          break
        case "LimitExceededException":
        case "TooManyRequestsException":
          setError("root.serverError", {
            type: "server",
            message: "Too many attempts. Please try again later.",
          })
          break
        default:
          console.error("Cognito sign-in error:", error)
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
          title="Welcome back"
          description="Enter your email below to sign in to your account"
        />
        <Field data-invalid={!!errors.email || credentialsInvalid}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email || credentialsInvalid}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email", { onChange: clearServerError })}
          />
          <FieldError id="email-error">{errors.email?.message}</FieldError>
        </Field>
        <Field data-invalid={!!errors.password || credentialsInvalid}>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/reset-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password || credentialsInvalid}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password", { onChange: clearServerError })}
          />
          <FieldError id="password-error">
            {errors.password?.message}
          </FieldError>
        </Field>
        <Field>
          <FieldError role="alert">{serverError?.message}</FieldError>
          <Button type="submit" disabled={isSubmitting || !email || !password}>
            Sign In
            {isSubmitting ? (
              <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />
            ) : null}
          </Button>
        </Field>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
          Or continue with
        </FieldSeparator>
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="underline underline-offset-4">
            Sign up
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
