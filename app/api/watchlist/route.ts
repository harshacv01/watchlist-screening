import { NextResponse } from "next/server";

const MAX_BYTES = 50 * 1024 * 1024;

type LambdaResponse = {
  error?: string;
  url?: string;
  key?: string;
  contentType?: string;
};

export async function POST(req: Request) {
  const lambdaUrl = process.env.WATCHLIST_LAMBDA_URL;

  if (!lambdaUrl) {
    return NextResponse.json(
      { error: "Watchlist upload service is not configured" },
      { status: 500 },
    );
  }

  let body: {
    fileName?: unknown;
    fileType?: unknown;
    fileSize?: unknown;
    action?: unknown;
    purpose?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { fileName, fileType, fileSize, action, purpose } = body;

  // Basic validation
  if (typeof fileName !== "string" || !fileName.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Only .csv files are allowed" },
      { status: 400 },
    );
  }

  if (
    typeof fileSize !== "number" ||
    fileSize <= 0 ||
    fileSize > MAX_BYTES
  ) {
    return NextResponse.json(
      { error: "File too large (max 50 MB)" },
      { status: 400 },
    );
  }

  try {
    const lambdaResponse = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        fileType: typeof fileType === "string" ? fileType : "text/csv",
        fileSize,
        action: typeof action === "string" ? action : "presign",
        purpose: typeof purpose === "string" ? purpose : "",
      }),
      cache: "no-store",
    });

    const result = (await lambdaResponse.json()) as LambdaResponse;

    if (!lambdaResponse.ok) {
      return NextResponse.json(
        { error: result.error || "The upload service rejected the request" },
        { status: lambdaResponse.status },
      );
    }

    if (!result.url) {
      return NextResponse.json(
        { error: "The upload service did not return an upload URL" },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "The upload service is unavailable" },
      { status: 502 },
    );
  }
}