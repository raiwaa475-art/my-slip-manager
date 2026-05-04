import { NextResponse } from "next/server";

/**
 * DEPRECATED: This API route previously handled OCR on the server.
 * Following the "Iron Rule", OCR is now handled entirely on the client-side
 * within SlipContext.tsx to avoid Node.js environment mismatch errors
 * and reduce server load.
 */

export async function POST() {
  return NextResponse.json(
    { error: "OCR processing has moved to the client. Please update your client to use the local OCR logic." },
    { status: 410 } // 410 Gone
  );
}
