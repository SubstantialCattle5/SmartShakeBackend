-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'TECH', 'ADMIN');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('PRODUCT', 'PACKAGE', 'MACHINE', 'SERVICE', 'SUBSCRIPTION', 'APP', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('QUALITY', 'SERVICE', 'TECHNICAL', 'PRICING', 'DELIVERY', 'FEATURE_REQUEST', 'COMPLAINT', 'COMPLIMENT');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED');

-- AlterTable
ALTER TABLE "drink_products" ADD COLUMN     "averageRating" DECIMAL(3,2),
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "subscription_packages" ADD COLUMN     "averageRating" DECIMAL(3,2),
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "vending_machine_references" ADD COLUMN     "averageRating" DECIMAL(3,2),
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "productId" INTEGER,
    "packageId" INTEGER,
    "subscriptionId" INTEGER,
    "machineId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "deviceInfo" JSONB,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_responses" (
    "id" SERIAL NOT NULL,
    "feedbackId" INTEGER NOT NULL,
    "responderId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_attachments" (
    "id" SERIAL NOT NULL,
    "feedbackId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedbacks_userId_status_idx" ON "feedbacks"("userId", "status");

-- CreateIndex
CREATE INDEX "feedbacks_feedbackType_status_idx" ON "feedbacks"("feedbackType", "status");

-- CreateIndex
CREATE INDEX "feedbacks_rating_createdAt_idx" ON "feedbacks"("rating", "createdAt");

-- CreateIndex
CREATE INDEX "feedbacks_category_priority_idx" ON "feedbacks"("category", "priority");

-- CreateIndex
CREATE INDEX "feedback_responses_feedbackId_idx" ON "feedback_responses"("feedbackId");

-- CreateIndex
CREATE INDEX "feedback_responses_responderId_idx" ON "feedback_responses"("responderId");

-- CreateIndex
CREATE INDEX "feedback_attachments_feedbackId_idx" ON "feedback_attachments"("feedbackId");

-- CreateIndex
CREATE INDEX "drink_products_isActive_idx" ON "drink_products"("isActive");

-- CreateIndex
CREATE INDEX "drink_products_averageRating_idx" ON "drink_products"("averageRating");

-- CreateIndex
CREATE INDEX "subscription_packages_isActive_idx" ON "subscription_packages"("isActive");

-- CreateIndex
CREATE INDEX "subscription_packages_category_idx" ON "subscription_packages"("category");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_role_idx" ON "users"("isActive", "role");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "drink_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "subscription_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_attachments" ADD CONSTRAINT "feedback_attachments_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
