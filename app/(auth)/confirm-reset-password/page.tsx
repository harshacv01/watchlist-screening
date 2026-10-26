import { Suspense } from "react"

import { ConfirmResetPassword } from "@/components/core/auth/confirm-reset-password"

export default function ConfirmResetPasswordPage() {
  // ConfirmResetPassword reads ?email= with useSearchParams, which needs a Suspense boundary
  return (
    <Suspense>
      <ConfirmResetPassword />
    </Suspense>
  )
}
