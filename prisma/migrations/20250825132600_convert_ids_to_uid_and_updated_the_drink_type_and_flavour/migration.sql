/*
  Warnings:

  - The primary key for the `blacklisted_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `consumptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `drinkSlot` on the `consumptions` table. All the data in the column will be lost.
  - The `drinkType` column on the `consumptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `drink_vouchers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `otp_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `payment_methods` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vending_machines` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "DrinkType" AS ENUM ('MILK', 'WATER');

-- CreateEnum
CREATE TYPE "DrinkFlavour" AS ENUM ('COFFEE', 'VANILLA', 'STRAWBERRY');

-- DropForeignKey
ALTER TABLE "blacklisted_tokens" DROP CONSTRAINT "blacklisted_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "consumptions" DROP CONSTRAINT "consumptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "consumptions" DROP CONSTRAINT "consumptions_voucherId_fkey";

-- DropForeignKey
ALTER TABLE "drink_vouchers" DROP CONSTRAINT "drink_vouchers_orderId_fkey";

-- DropForeignKey
ALTER TABLE "drink_vouchers" DROP CONSTRAINT "drink_vouchers_userId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "otp_codes" DROP CONSTRAINT "otp_codes_userId_fkey";

-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_orderId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_userId_fkey";

-- AlterTable
ALTER TABLE "blacklisted_tokens" DROP CONSTRAINT "blacklisted_tokens_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "blacklisted_tokens_id_seq";

-- AlterTable
ALTER TABLE "consumptions" DROP CONSTRAINT "consumptions_pkey",
DROP COLUMN "drinkSlot",
ADD COLUMN     "drinkFlavour" "DrinkFlavour" NOT NULL DEFAULT 'VANILLA',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "voucherId" SET DATA TYPE TEXT,
DROP COLUMN "drinkType",
ADD COLUMN     "drinkType" "DrinkType" NOT NULL DEFAULT 'WATER',
ADD CONSTRAINT "consumptions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "consumptions_id_seq";

-- AlterTable
ALTER TABLE "drink_vouchers" DROP CONSTRAINT "drink_vouchers_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "orderId" SET DATA TYPE TEXT,
ADD CONSTRAINT "drink_vouchers_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "drink_vouchers_id_seq";

-- AlterTable
ALTER TABLE "orders" DROP CONSTRAINT "orders_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "orders_id_seq";

-- AlterTable
ALTER TABLE "otp_codes" DROP CONSTRAINT "otp_codes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "otp_codes_id_seq";

-- AlterTable
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "payment_methods_id_seq";

-- AlterTable
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "orderId" SET DATA TYPE TEXT,
ALTER COLUMN "paymentMethodId" SET DATA TYPE TEXT,
ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "transactions_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AlterTable
ALTER TABLE "vending_machines" DROP CONSTRAINT "vending_machines_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "vending_machines_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "vending_machines_id_seq";

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklisted_tokens" ADD CONSTRAINT "blacklisted_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_vouchers" ADD CONSTRAINT "drink_vouchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_vouchers" ADD CONSTRAINT "drink_vouchers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "drink_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
