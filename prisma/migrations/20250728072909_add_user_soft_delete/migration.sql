-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "users_deleted_idx" ON "users"("deleted");
