import * as React from "react"

const COOLDOWN_MS = 60_000

// Storage can be blocked (private mode, disabled site data), so every access is guarded.
// This is only a UX guard; Cognito enforces the real rate limit server-side.
function readEndsAt(key: string) {
  try {
    const value = Number(window.localStorage.getItem(key))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function writeEndsAt(key: string, endsAt: number | null) {
  try {
    if (endsAt === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, String(endsAt))
  } catch {
    // Falls back to the in-memory countdown only
  }
}

// Sign-up verification codes and password-reset codes are limited separately by Cognito
type CodePurpose = "verify" | "reset"

function storageKey(email: string, purpose: CodePurpose) {
  return `resend-cooldown:${purpose}:${email.toLowerCase()}`
}

/** Starts the cooldown for an email whose code was just sent from outside the code page. */
export function markCodeSent(email: string, purpose: CodePurpose = "verify") {
  writeEndsAt(storageKey(email, purpose), Date.now() + COOLDOWN_MS)
}

/**
 * Cooldown between code resends. The end time is stored per email and purpose,
 * so the countdown continues after a page refresh or in a new tab.
 */
export function useResendCooldown(
  email: string,
  purpose: CodePurpose = "verify"
) {
  const key = storageKey(email, purpose)
  const [endsAt, setEndsAt] = React.useState(0)
  const [now, setNow] = React.useState(0)

  // localStorage only exists in the browser, so read it after mount
  React.useEffect(() => {
    setEndsAt(readEndsAt(key))
    setNow(Date.now())
  }, [key])

  React.useEffect(() => {
    if (endsAt <= Date.now()) return

    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) {
        window.clearInterval(id)
        writeEndsAt(key, null)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [endsAt, key])

  const start = React.useCallback(() => {
    const current = Date.now()
    writeEndsAt(key, current + COOLDOWN_MS)
    setEndsAt(current + COOLDOWN_MS)
    setNow(current)
  }, [key])

  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000))

  return { secondsLeft, start }
}
