-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}';
