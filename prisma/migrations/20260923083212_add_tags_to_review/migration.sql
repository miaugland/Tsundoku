-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
