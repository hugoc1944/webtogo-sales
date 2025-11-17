-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ASSOCIATE');

-- CreateEnum
CREATE TYPE "LeadState" AS ENUM ('NEW', 'NO_ANSWER', 'CALL_LATER', 'BOOKED', 'REFUSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ASSOCIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT NOT NULL,
    "email" TEXT,
    "emailStatus" TEXT,
    "phoneWork" TEXT,
    "phoneMobile" TEXT,
    "phoneCorp" TEXT,
    "industry" TEXT,
    "keywords" TEXT,
    "website" TEXT,
    "companyCity" TEXT,
    "state" "LeadState" NOT NULL DEFAULT 'NEW',
    "callNote" TEXT,
    "callLaterAt" TIMESTAMP(3),
    "noAnswerAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
