import { callLambda } from "@/lib/lamda";

// Only these actions can be called from the browser
const ALLOWED_ACTIONS = ["presign", "load", "screen_batch"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

export async function POST(request: Request) {
  // 1. Read and check the request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (typeof action !== "string" || !ALLOWED_ACTIONS.includes(action as Action)) {
    return Response.json(
      { error: `action must be one of: ${ALLOWED_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  // 2. Forward to the Lambda
  try {
    const lambda = await callLambda(body, {
      signal: AbortSignal.timeout(60_000), // "load" on the full list takes a few seconds
    });
    if (lambda.error) return lambda.error;
    const lambdaRes = lambda.response;

    // 3. Pass the Lambda's status and JSON straight back to the browser
    const text = await lambdaRes.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Lambda returned non-JSON:", text.slice(0, 500));
      return Response.json({ error: "Unexpected response from Lambda" }, { status: 502 });
    }

    return Response.json(data, { status: lambdaRes.status });
  } catch (error) {
    console.error("Error calling Lambda:", error);
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return Response.json(
      { error: timedOut ? "Lambda took too long to respond" : "Could not reach Lambda" },
      { status: timedOut ? 504 : 502 },
    );
  }
}