/*
  Warnings:

  - You are about to drop the column `qrCode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `drink_consumptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drink_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `feedback_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `feedback_responses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `feedbacks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `package_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vending_machine_references` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phonepeMerchantId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('VOUCHER_PURCHASE', 'VOUCHER_TOPUP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConsumptionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ConsumptionStatus" ADD VALUE 'REVERSED';

-- DropForeignKey
ALTER TABLE "drink_consumptions" DROP CONSTRAINT "drink_consumptions_productId_fkey";

-- DropForeignKey
ALTER TABLE "drink_consumptions" DROP CONSTRAINT "drink_consumptions_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "drink_consumptions" DROP CONSTRAINT "drink_consumptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "feedback_attachments" DROP CONSTRAINT "feedback_attachments_feedbackId_fkey";

-- DropForeignKey
ALTER TABLE "feedback_responses" DROP CONSTRAINT "feedback_responses_feedbackId_fkey";

-- DropForeignKey
ALTER TABLE "feedback_responses" DROP CONSTRAINT "feedback_responses_responderId_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_packageId_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_productId_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "package_items" DROP CONSTRAINT "package_items_packageId_fkey";

-- DropForeignKey
ALTER TABLE "package_items" DROP CONSTRAINT "package_items_productId_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_orderId_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_packageId_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_userId_fkey";

-- DropIndex
DROP INDEX "users_qrCode_key";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'VOUCHER_PURCHASE',
ADD COLUMN     "totalDrinks" INTEGER;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "qrCode";

-- DropTable
DROP TABLE "drink_consumptions";

-- DropTable
DROP TABLE "drink_products";

-- DropTable
DROP TABLE "feedback_attachments";

-- DropTable
DROP TABLE "feedback_responses";

-- DropTable
DROP TABLE "feedbacks";

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "package_items";

-- DropTable
DROP TABLE "subscription_packages";

-- DropTable
DROP TABLE "user_subscriptions";

-- DropTable
DROP TABLE "vending_machine_references";

-- DropEnum
DROP TYPE "FeedbackCategory";

-- DropEnum
DROP TYPE "FeedbackPriority";

-- DropEnum
DROP TYPE "FeedbackStatus";

-- DropEnum
DROP TYPE "FeedbackType";

-- DropEnum
DROP TYPE "OrderItemType";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "drink_vouchers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "totalDrinks" INTEGER NOT NULL,
    "consumedDrinks" INTEGER NOT NULL DEFAULT 0,
    "pricePerDrink" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstUsedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" INTEGER,

    CONSTRAINT "drink_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machineId" TEXT NOT NULL,
    "machineQRCode" TEXT,
    "location" TEXT,
    "drinkType" TEXT,
    "drinkSlot" TEXT,
    "externalTransactionId" TEXT,
    "vendingSessionId" TEXT,
    "status" "ConsumptionStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "preConsumptionBalance" INTEGER NOT NULL,
    "postConsumptionBalance" INTEGER NOT NULL,
    "voucherVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vending_machines" (
    "id" SERIAL NOT NULL,
    "machineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "pincode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastPing" TIMESTAMP(3),
    "qrCode" TEXT NOT NULL,
    "qrCodeType" TEXT NOT NULL DEFAULT 'MACHINE_ID',
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vending_machines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drink_vouchers_voucherNumber_key" ON "drink_vouchers"("voucherNumber");

-- CreateIndex
CREATE INDEX "drink_vouchers_userId_status_idx" ON "drink_vouchers"("userId", "status");

-- CreateIndex
CREATE INDEX "drink_vouchers_voucherNumber_idx" ON "drink_vouchers"("voucherNumber");

-- CreateIndex
CREATE INDEX "drink_vouchers_expiryDate_idx" ON "drink_vouchers"("expiryDate");

-- CreateIndex
CREATE INDEX "drink_vouchers_isActivated_status_idx" ON "drink_vouchers"("isActivated", "status");

-- CreateIndex
CREATE INDEX "drink_vouchers_version_idx" ON "drink_vouchers"("version");

-- CreateIndex
CREATE UNIQUE INDEX "consumptions_externalTransactionId_key" ON "consumptions"("externalTransactionId");

-- CreateIndex
CREATE INDEX "consumptions_userId_consumedAt_idx" ON "consumptions"("userId", "consumedAt");

-- CreateIndex
CREATE INDEX "consumptions_voucherId_idx" ON "consumptions"("voucherId");

-- CreateIndex
CREATE INDEX "consumptions_machineId_consumedAt_idx" ON "consumptions"("machineId", "consumedAt");

-- CreateIndex
CREATE INDEX "consumptions_externalTransactionId_idx" ON "consumptions"("externalTransactionId");

-- CreateIndex
CREATE INDEX "consumptions_vendingSessionId_idx" ON "consumptions"("vendingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "vending_machines_machineId_key" ON "vending_machines"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "vending_machines_qrCode_key" ON "vending_machines"("qrCode");

-- CreateIndex
CREATE INDEX "vending_machines_city_idx" ON "vending_machines"("city");

-- CreateIndex
CREATE INDEX "vending_machines_isActive_isOnline_idx" ON "vending_machines"("isActive", "isOnline");

-- CreateIndex
CREATE INDEX "vending_machines_qrCode_idx" ON "vending_machines"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_phonepeMerchantId_key" ON "transactions"("phonepeMerchantId");

-- AddForeignKey
ALTER TABLE "drink_vouchers" ADD CONSTRAINT "drink_vouchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_vouchers" ADD CONSTRAINT "drink_vouchers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "drink_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
