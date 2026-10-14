-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "isShort" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Content_isShort_status_idx" ON "Content"("isShort", "status");
