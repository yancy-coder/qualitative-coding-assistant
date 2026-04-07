import { NextResponse } from "next/server";
import { parseDocxToSegments } from "@/lib/qualitative/parseDocx";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const allSegments = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const segments = await parseDocxToSegments(buffer, file.name);
      allSegments.push(...segments);
    }

    return NextResponse.json({ segments: allSegments });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
