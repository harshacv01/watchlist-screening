import { Suspense } from "react"

import { VerifyEmailForm } from "@/components/core/auth/verify-email-form"

export default function VerifyEmailPage() {
  // VerifyEmailForm reads ?email= with useSearchParams, which needs a Suspense boundary
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  )
}
