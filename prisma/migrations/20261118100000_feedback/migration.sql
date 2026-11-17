-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "linkId" TEXT,
    "linkLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER NOT NULL,
    "ease" INTEGER NOT NULL,
    "donnaHelpful" TEXT NOT NULL,
    "wouldContact" TEXT NOT NULL,
    "missing" TEXT NOT NULL DEFAULT '',
    "improve" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_linkId_idx" ON "Feedback"("linkId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "AccessLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
