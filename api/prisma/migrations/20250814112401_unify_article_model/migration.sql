-- CreateTable
CREATE TABLE "public"."ArticleStatus" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArticleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleStatus_userId_articleId_key" ON "public"."ArticleStatus"("userId", "articleId");

-- AddForeignKey
ALTER TABLE "public"."ArticleStatus" ADD CONSTRAINT "ArticleStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleStatus" ADD CONSTRAINT "ArticleStatus_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
