-- CreateTable
CREATE TABLE "blacklisted_tokens" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_tokens_tokenHash_key" ON "blacklisted_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_tokenHash_idx" ON "blacklisted_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_userId_idx" ON "blacklisted_tokens"("userId");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_expiresAt_idx" ON "blacklisted_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "blacklisted_tokens" ADD CONSTRAINT "blacklisted_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
