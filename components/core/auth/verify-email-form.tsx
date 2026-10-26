"use client"

import { useState } from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { toast } from "sonner"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { useResendCooldown } from "@/hooks/use-resend-cooldown"

import { AuthHeader } from "./auth-header"

const verifyEmailSchema = z.object({
  verificationCode: z
    .string()
    .length(6, { message: "Verification code must be 6 digits" })
    .regex(/^\d+$/, { message: "Verification code must contain only digits" }),
})

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>

type ResendError = { message: string; href?: string; linkText?: string }

const slotClass =
  "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl"

export function VerifyEmailForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    clearErrors,
    watch,
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { verificationCode: "" },
  })

  const searchParams = useSearchParams()
  const router = useRouter()

  const email = searchParams.get("email") ?? ""
  const verificationCode = watch("verificationCode")

  const cooldown = useResendCooldown(email)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<ResendError | null>(null)

  // Returns true when Cognito accepted the request and emailed a new code
  async function sendNewCode() {
    setResendError(null)
    setResending(true)
    try {
      await resendSignUpCode({ username: email })
      cooldown.start()
      setValue("verificationCode", "")
      return true
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      switch (name) {
        case "LimitExceededException":
          setResendError({
            message:
              "Too many requests. Please wait a few minutes and try again.",
          })
          break
        case "InvalidParameterException":
          // Cognito returns this when the account is already confirmed
          setResendError({
            message: "This email is already verified.",
            href: "/sign-in",
            linkText: "Sign in",
          })
          break
        case "UserNotFoundException":
          setResendError({
            message: "We couldn't find an account for this email.",
            href: "/sign-up",
            linkText: "Create an account",
          })
          break
        default:
          console.error("Cognito resend code error:", error)
          setResendError({
            message: "Couldn't send a new code. Please try again.",
          })
      }
      return false
    } finally {
      setResending(false)
    }
  }

  async function onSubmit(values: VerifyEmailFormValues) {
    try {
      const result = await confirmSignUp({
        username: email,
        confirmationCode: values.verificationCode.trim(),
      })

      if (result.isSignUpComplete) {
        router.push("/sign-in")
      }

      console.log("Email verification successful:", result)
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      switch (name) {
        case "CodeMismatchException":
          setError("verificationCode", {
            type: "manual",
            message: "Invalid code provided, please request a code again.",
          })
          break

        case "ExpiredCodeException": {
          // The expired code is useless, so send a fresh one unless we're still in the cooldown
          const sent = cooldown.secondsLeft === 0 && (await sendNewCode())
          setError("verificationCode", {
            type: "manual",
            message: sent
              ? "This code has expired. We've sent a new one to your email."
              : "This code has expired. Please request a new code.",
          })
          break
        }

        case "NotAuthorizedException":
          // Cognito returns this when the account is already confirmed
          toast.info("This email is already verified. Please sign in.")
          router.push("/sign-in")
          break

        case "LimitExceededException":
        case "TooManyFailedAttemptsException":
          setError("verificationCode", {
            type: "manual",
            message:
              "Too many attempts. Please wait a few minutes and try again.",
          })
          break

        default:
          console.error("Cognito confirm sign-up error:", error)
          setError("verificationCode", {
            type: "manual",
            message: "Something went wrong. Please try again.",
          })
      }
    }
  }

  async function onResend() {
    if (await sendNewCode()) {
      clearErrors("verificationCode")
      toast.success(`A new code was sent to ${email}`)
    }
  }

  if (!email) {
    return (
      <div className="p-6 md:p-8">
        <FieldGroup>
          <AuthHeader
            title="Verify your email"
            description="We couldn't tell which email to verify."
          />
          <FieldDescription className="text-center">
            <Link href="/sign-up" className="underline underline-offset-4">
              Back to sign up
            </Link>
          </FieldDescription>
        </FieldGroup>
      </div>
    )
  }

  return (
    // The card and background image come from app/(auth)/layout.tsx
    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <AuthHeader
          title="Verify your email"
          description={
            <>
              Enter the verification code we sent to{" "}
              {email ? (
                <span className="font-medium text-foreground">{email}</span>
              ) : (
                "your email address"
              )}
            </>
          }
        />

        <Field>
          <div className="my-2 flex items-center justify-between rounded-md">
            <FieldLabel htmlFor="otp-verification">
              Verification code
            </FieldLabel>
            <Button
              type="button"
              onClick={onResend}
              disabled={resending || cooldown.secondsLeft > 0}
            >
              {cooldown.secondsLeft > 0
                ? `Resend code in ${cooldown.secondsLeft}s`
                : "Resend Code"}
              {resending ? (
                <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />
              ) : null}
            </Button>
          </div>
          <Controller
            name="verificationCode"
            control={control}
            render={({ field, fieldState }) => (
              <InputOTP
                id="otp-verification"
                containerClassName="justify-center"
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              >
                <InputOTPGroup className={slotClass}>
                  {[0, 1, 2].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      aria-invalid={fieldState.invalid}
                    />
                  ))}
                </InputOTPGroup>
                <InputOTPSeparator className="mx-2" />
                <InputOTPGroup className={slotClass}>
                  {[3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      aria-invalid={fieldState.invalid}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />

          <FieldError errors={[errors.verificationCode]} />
          {resendError ? (
            <FieldError role="alert">
              {resendError.message}
              {resendError.href ? (
                <>
                  {" "}
                  <Link
                    href={resendError.href}
                    className="underline underline-offset-4"
                  >
                    {resendError.linkText}
                  </Link>
                </>
              ) : null}
            </FieldError>
          ) : null}
        </Field>

        <Field>
          <Button
            type="submit"
            className="w-full"
            disabled={verificationCode.length === 0 || isSubmitting}
          >
            Verify Email
            {isSubmitting ? (
              <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />
            ) : null}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          <Link href="/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
