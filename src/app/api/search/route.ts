import { NextRequest, NextResponse } from "next/server";
import { searchContent } from "@/lib/search";

/** GET /api/search?q=... */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const items = await searchContent(q);
  return NextResponse.json({ items });
}
