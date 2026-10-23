"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { toast } from "sonner"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { confirmResetPassword, resetPassword } from "aws-amplify/auth"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { useResendCooldown } from "@/hooks/use-resend-cooldown"

import { AuthHeader } from "./auth-header"
import {
  confirmResetPasswordSchema,
  type ConfirmResetPasswordValues,
} from "./schemas"

const slotClass =
  "*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl"

export function ConfirmResetPassword() {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    clearErrors,
    watch,
  } = useForm<ConfirmResetPasswordValues>({
    resolver: zodResolver(confirmResetPasswordSchema),
    mode: "onBlur",
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  })

  const searchParams = useSearchParams()
  const router = useRouter()

  const email = searchParams.get("email") ?? ""
  const { code, newPassword, confirmPassword } = watch()

  const cooldown = useResendCooldown(email, "reset")
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  // Requesting a reset again is how Cognito sends a new reset code.
  // Returns true when Cognito accepted the request and emailed a new code.
  async function sendNewCode() {
    setResendError(null)
    setResending(true)
    try {
      await resetPassword({ username: email })
      cooldown.start()
      setValue("code", "")
      return true
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      if (name === "LimitExceededException") {
        setResendError("Too many requests. Please wait a while and try again.")
      } else {
        console.error("Cognito resend reset code error:", error)
        setResendError("Couldn't send a new code. Please try again.")
      }
      return false
    } finally {
      setResending(false)
    }
  }

  async function onSubmit(values: ConfirmResetPasswordValues) {
    try {
      // Cognito checks the code and sets the new password in the same call
      await confirmResetPassword({
        username: email,
        confirmationCode: values.code.trim(),
        newPassword: values.newPassword,
      })

      toast.success("Password updated. Please sign in.")
      router.push("/sign-in")
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      switch (name) {
        case "CodeMismatchException":
          setError("code", {
            type: "server",
            message: "Invalid code. Please check it and try again.",
          })
          break

        case "ExpiredCodeException": {
          // The expired code is useless, so send a fresh one unless we're still in the cooldown
          const sent = cooldown.secondsLeft === 0 && (await sendNewCode())
          setError("code", {
            type: "server",
            message: sent
              ? "This code has expired. We've sent a new one to your email."
              : "This code has expired. Please request a new code.",
          })
          break
        }

        case "InvalidPasswordException":
          // Cognito's message names the policy rule that failed, e.g. "must have uppercase characters"
          setError("newPassword", {
            type: "server",
            message:
              error instanceof Error && error.message
                ? error.message
                : "Password does not meet the requirements.",
          })
          break

        case "LimitExceededException":
        case "TooManyFailedAttemptsException":
          setError("code", {
            type: "server",
            message: "Too many attempts. Please wait a while and try again.",
          })
          break

        default:
          console.error("Cognito confirm reset password error:", error)
          setError("root.serverError", {
            type: "server",
            message: "Something went wrong. Please try again.",
          })
      }
    }
  }

  async function onResend() {
    if (await sendNewCode()) {
      clearErrors("code")
      toast.success(`A new code was sent to ${email}`)
    }
  }

  if (!email) {
    return (
      <div className="p-6 md:p-8">
        <FieldGroup>
          <AuthHeader
            title="Reset your password"
            description="We couldn't tell which account to reset."
          />
          <FieldDescription className="text-center">
            <Link
              href="/reset-password"
              className="underline underline-offset-4"
            >
              Request a reset code
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
          title="Reset your password"
          description={
            <>
              Enter the code we sent to{" "}
              <span className="font-medium text-foreground">{email}</span> and
              choose a new password
            </>
          }
        />

        <Field data-invalid={!!errors.code}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="reset-code">Reset code</FieldLabel>
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
            name="code"
            control={control}
            render={({ field, fieldState }) => (
              <InputOTP
                id="reset-code"
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
          <FieldError errors={[errors.code]} />
          {resendError ? (
            <FieldError role="alert">{resendError}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register("newPassword", { deps: ["confirmPassword"] })}
          />
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>

        <Field>
          <FieldError role="alert">
            {errors.root?.serverError?.message}
          </FieldError>
          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting ||
              code.length < 6 ||
              !newPassword ||
              !confirmPassword
            }
          >
            Reset Password
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
