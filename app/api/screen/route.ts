import { NextResponse } from "next/server"

import { callLambda } from "@/lib/lamda"

export async function POST(req: Request) {
  let body: {
    name?: unknown
    dob?: unknown
    threshold?: unknown
    action?: unknown
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { name, dob, threshold, action } = body

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json(
      { error: "Invalid name. It must be a non-empty string." },
      { status: 400 }
    )
  }

  if (typeof threshold !== "number" || threshold < 0 || threshold > 100) {
    return NextResponse.json(
      { error: "Invalid threshold. It must be a number between 0 and 100." },
      { status: 400 }
    )
  }

  const isValidDob =
    typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)
      ? (() => {
          const [year, month, day] = dob.split("-").map(Number)
        const parsedDate = new Date(`${dob}T00:00:00Z`)
          return (
            parsedDate.getUTCFullYear() === year &&
            parsedDate.getUTCMonth() === month - 1 &&
            parsedDate.getUTCDate() === day
          )
        })()
      : false

  if (dob !== undefined && !isValidDob) {
    return NextResponse.json(
      { error: "Invalid date of birth. It must use the YYYY-MM-DD format." },
      { status: 400 }
    )
  }

  try {
    const lambda = await callLambda({
      name,
      ...(dob !== undefined ? { dob } : {}),
      threshold,
      action: typeof action === "string" ? action : "screen",
    })
    if (lambda.error) return lambda.error
    const lambdaResponse = lambda.response

    const responseText = await lambdaResponse.text()
    let result: unknown

    try {
      result = JSON.parse(responseText)
    } catch (error) {
      console.error("Screening service returned non-JSON:", error)
      return NextResponse.json(
        { error: "The screening service returned an invalid response" },
        { status: 502 }
      )
    }

    if (!lambdaResponse.ok) {
      const errorMessage =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "The screening service rejected the request"

      return NextResponse.json(
        { error: errorMessage },
        { status: lambdaResponse.status }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error calling screening service:", error)
    return NextResponse.json(
      { error: "The screening service is unavailable" },
      { status: 502 }
    )
  }
}
