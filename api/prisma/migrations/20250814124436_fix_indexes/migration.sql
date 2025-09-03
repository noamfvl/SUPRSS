-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "public"."Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_feedId_publishedAt_idx" ON "public"."Article"("feedId", "publishedAt");

-- CreateIndex
CREATE INDEX "Feed_collectionId_idx" ON "public"."Feed"("collectionId");

-- CreateIndex
CREATE INDEX "Feed_category_idx" ON "public"."Feed"("category");
