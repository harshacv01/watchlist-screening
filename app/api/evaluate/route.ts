import { NextResponse } from "next/server"

import { callLambda } from "@/lib/lamda"

// Actions this route is allowed to send to the Lambda
const ALLOWED_ACTIONS = ["presign", "evaluate"]

export async function POST(req: Request) {
  // 1. Read the request body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // 2. Check the action
  const action = typeof body.action === "string" ? body.action : "evaluate"
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  // 3. "evaluate" needs the S3 key; "presign" needs the file name
  if (action === "evaluate" && (typeof body.key !== "string" || body.key.trim() === "")) {
    return NextResponse.json(
      { error: "Invalid key. It must be a non-empty string." },
      { status: 400 }
    )
  }
  if (action === "presign" && (typeof body.fileName !== "string" || body.fileName.trim() === "")) {
    return NextResponse.json({ error: "Missing file name" }, { status: 400 })
  }

  // 4. Forward everything to the Lambda (fileName, fileType, fileSize for presign; key for evaluate)
  try {
    const lambda = await callLambda({ ...body, action })
    if (lambda.error) return lambda.error
    const lambdaResponse = lambda.response

    const text = await lambdaResponse.text()
    let result: Record<string, unknown> = {}
    try {
      result = JSON.parse(text)
    } catch {
      // Not JSON - e.g. an API Gateway timeout page
      result = { error: text || "The evaluation service returned an empty response" }
    }

    // 5. Pass the Lambda's own error message and status through to the page
    if (!lambdaResponse.ok) {
      console.error(`Error from evaluation service (${action}): ${lambdaResponse.status} - ${text}`)
      const message =
        (result.error as string) || (result.message as string) || "The evaluation service returned an error"
      const status = lambdaResponse.status >= 500 ? 502 : lambdaResponse.status
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error calling evaluation service:", error)
    return NextResponse.json(
      { error: "The evaluation service is unavailable" },
      { status: 502 }
    )
  }
}