import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";

/**
 * POST /api/creators/:id/subscribe — toggles a channel subscription (구독).
 * Requires a real session — guests can browse but not subscribe.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: creatorId } = await params;

  const user = await getSessionAppUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const subscriberId = user.id;

  if (subscriberId === creatorId) {
    return NextResponse.json({ error: "자기 자신은 구독할 수 없습니다" }, { status: 400 });
  }
  const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { id: true } });
  if (!creator) {
    return NextResponse.json({ error: "creator not found" }, { status: 404 });
  }

  const existing = await prisma.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId, creatorId } },
  });

  let subscribed: boolean;
  if (existing) {
    await prisma.subscription.delete({ where: { subscriberId_creatorId: { subscriberId, creatorId } } });
    subscribed = false;
  } else {
    await prisma.subscription.create({ data: { subscriberId, creatorId } });
    subscribed = true;
  }

  const subscriberCount = await prisma.subscription.count({ where: { creatorId } });
  return NextResponse.json({ subscribed, subscriberCount });
}
