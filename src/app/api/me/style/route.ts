import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";

/** GET /api/me/style — the logged-in user's 수학 스타일 레이더 (로그인 필요). */
export async function GET() {
  const user = await getSessionAppUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const profile = await prisma.userStyleProfile.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    logicScore: profile?.logicScore ?? 0,
    curiosityScore: profile?.curiosityScore ?? 0,
    calculationScore: profile?.calculationScore ?? 0,
    intuitionScore: profile?.intuitionScore ?? 0,
    hasActivity: !!profile,
  });
}
