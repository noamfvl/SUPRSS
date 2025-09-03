/*
  Warnings:

  - A unique constraint covering the columns `[collectionId,url]` on the table `Feed` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Feed` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Feed" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3),
ADD COLUMN     "lastModified" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."Article" (
    "id" SERIAL NOT NULL,
    "feedId" INTEGER NOT NULL,
    "guid" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "summary" TEXT,
    "contentText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_feedId_url_key" ON "public"."Article"("feedId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Article_feedId_guid_key" ON "public"."Article"("feedId", "guid");

-- CreateIndex
CREATE UNIQUE INDEX "Feed_collectionId_url_key" ON "public"."Feed"("collectionId", "url");

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "public"."Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
