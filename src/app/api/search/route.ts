import { NextRequest, NextResponse } from "next/server";
import { searchContent, searchCreators } from "@/lib/search";

/** GET /api/search?q=... — { creators, items } */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const [creators, items] = await Promise.all([searchCreators(q), searchContent(q)]);
  return NextResponse.json({ creators, items });
}
