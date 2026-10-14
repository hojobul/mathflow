import { ContentStatus, ContentVisibility, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAppUser } from "@/lib/auth/currentUser";

/** 피드·검색·탐색·채널 목록에 나가도 되는 콘텐츠 조건. 일부공개(링크)·비공개·임시저장은 제외한다. */
export const PUBLICLY_LISTED: Prisma.ContentWhereInput = {
  status: ContentStatus.PUBLISHED,
  visibility: ContentVisibility.PUBLIC,
};

/** 링크로 열 수 있는 콘텐츠 조건(공개 + 일부공개). 비공개와 임시저장은 작성자만. */
export const LINK_VIEWABLE: Prisma.ContentWhereInput = {
  status: ContentStatus.PUBLISHED,
  visibility: { in: [ContentVisibility.PUBLIC, ContentVisibility.UNLISTED] },
};

/**
 * 현재 요청자가 이 콘텐츠를 볼 수 있는지. 작성자는 상태·공개 범위와 무관하게 볼 수 있다.
 * 존재하지 않거나 볼 수 없으면 false.
 */
export async function canViewContent(contentId: string): Promise<boolean> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { status: true, visibility: true, authorId: true },
  });
  if (!content) return false;
  if (content.status === ContentStatus.PUBLISHED && content.visibility !== ContentVisibility.PRIVATE) return true;
  const viewer = await getSessionAppUser();
  return !!viewer && viewer.id === content.authorId;
}
