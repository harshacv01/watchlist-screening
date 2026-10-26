"use client"

import { configureAmplify } from "@/lib/amplify"

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  configureAmplify()

  return <>{children}</>
}
