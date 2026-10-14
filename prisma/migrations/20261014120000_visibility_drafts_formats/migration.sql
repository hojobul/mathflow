-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "inFeed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inShorts" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from the old single-format flag
UPDATE "Content" SET "inFeed" = NOT "isShort", "inShorts" = "isShort";

-- DropIndex / DropColumn
DROP INDEX "Content_isShort_status_idx";
ALTER TABLE "Content" DROP COLUMN "isShort";

-- CreateIndex
CREATE INDEX "Content_inFeed_inShorts_idx" ON "Content"("inFeed", "inShorts");
CREATE INDEX "Content_visibility_status_idx" ON "Content"("visibility", "status");
