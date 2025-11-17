-- AlterEnum
ALTER TYPE "LeadState" ADD VALUE 'SKIP';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "lastCalledAt" TIMESTAMP(3),
ADD COLUMN     "noAnswerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviveAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Contact_state_idx" ON "Contact"("state");

-- CreateIndex
CREATE INDEX "Contact_reviveAt_idx" ON "Contact"("reviveAt");
