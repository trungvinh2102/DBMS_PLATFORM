/*
  Warnings:

  - You are about to drop the column `description` on the `databases` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `databases` table. All the data in the column will be lost.
  - Added the required column `databaseName` to the `databases` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "SSLMode" AS ENUM ('DISABLE', 'REQUIRE', 'VERIFY_CA', 'VERIFY_FULL');

-- DropIndex
DROP INDEX "databases_name_key";

-- AlterTable
ALTER TABLE "databases" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "databaseName" TEXT NOT NULL,
ADD COLUMN     "environment" "Environment" NOT NULL DEFAULT 'DEVELOPMENT',
ADD COLUMN     "host" TEXT,
ADD COLUMN     "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "port" INTEGER,
ADD COLUMN     "sshConfig" JSONB,
ADD COLUMN     "sslMode" "SSLMode" NOT NULL DEFAULT 'DISABLE',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "query_histories_executedAt_idx" ON "query_histories"("executedAt");

-- CreateIndex
CREATE INDEX "saved_queries_userId_idx" ON "saved_queries"("userId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
