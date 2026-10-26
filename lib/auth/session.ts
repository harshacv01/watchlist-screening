import { fetchAuthSession } from "aws-amplify/auth/server"

import { runWithAmplifyServerContext } from "@/lib/amplify-server"

import { roleFromGroups, type SessionUser } from "./roles"

type NextServerContext = Parameters<
  typeof runWithAmplifyServerContext
>[0]["nextServerContext"]

// Who is signed in and their role, read from the Cognito tokens in the request cookies
export async function getSessionUser(
  nextServerContext: NextServerContext
): Promise<SessionUser | null> {
  return runWithAmplifyServerContext({
    nextServerContext,
    operation: async (ctx) => {
      try {
        const { tokens } = await fetchAuthSession(ctx)
        if (!tokens?.accessToken) return null

        const access = tokens.accessToken.payload
        const email = tokens.idToken?.payload.email

        return {
          id: String(access.sub),
          email: typeof email === "string" ? email : null,
          role: roleFromGroups(access["cognito:groups"]),
        }
      } catch {
        return null
      }
    },
  })
}
