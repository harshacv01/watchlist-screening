import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchAuthSession } from "aws-amplify/auth/server"

import { runWithAmplifyServerContext } from "@/lib/amplify-server"

export async function getAccessToken() {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (ctx) =>
      (await fetchAuthSession(ctx)).tokens?.accessToken?.toString(),
  })
}

type LambdaCall =
  | { response: Response; error?: undefined }
  | { response?: undefined; error: NextResponse }

// Forwards the payload to the Lambda with the signed-in user's access token.
// `error` is set when the call never reached the Lambda (not configured or not signed in).
export async function callLambda(
  payload: unknown,
  options: { signal?: AbortSignal } = {}
): Promise<LambdaCall> {
  const lambdaUrl = process.env.LAMBDA_URL

  if (!lambdaUrl) {
    console.error("LAMBDA_URL is not set")
    return {
      error: NextResponse.json(
        { error: "Lambda service is not configured" },
        { status: 500 }
      ),
    }
  }

  const token = await getAccessToken()

  if (!token) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  const response = await fetch(lambdaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: options.signal,
  })

  return { response }
}
