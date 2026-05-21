-- CreateTable
CREATE TABLE "Pleading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "witnesses" TEXT,
    CONSTRAINT "Pleading_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pleading_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PleadingDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pleadingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PleadingDocument_pleadingId_fkey" FOREIGN KEY ("pleadingId") REFERENCES "Pleading" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contact" TEXT,
    "organization" TEXT,
    CONSTRAINT "Participant_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PoliceStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "district" TEXT,
    "code" TEXT,
    "address" TEXT,
    "contact" TEXT
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "code" TEXT,
    "isCapital" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Charge_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RelatedCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "relatedCaseId" TEXT NOT NULL,
    "relationType" TEXT,
    CONSTRAINT "RelatedCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RelatedCase_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BailRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionById" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BailRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BailRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BailRequest_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BailRequest_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filingDate" DATETIME NOT NULL,
    "nextHearing" DATETIME,
    "hearingLocation" TEXT,
    "plaintiff" TEXT NOT NULL,
    "defendant" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "instanceLevel" TEXT NOT NULL DEFAULT 'level4',
    "courtLevel" TEXT,
    "division" TEXT,
    "category" TEXT,
    "feesPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentRef" TEXT,
    "plaintiffAge" INTEGER,
    "plaintiffAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "judgeId" TEXT,
    "lawyerId" TEXT,
    "prosecutorId" TEXT,
    "policeStationId" TEXT,
    "policeCaseNumber" TEXT,
    "prosecutionNumber" TEXT,
    "stateAttorney" TEXT,
    "policeOfficer" TEXT,
    CONSTRAINT "Case_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_prosecutorId_fkey" FOREIGN KEY ("prosecutorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_policeStationId_fkey" FOREIGN KEY ("policeStationId") REFERENCES "PoliceStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Case" ("createdAt", "defendant", "deletedAt", "description", "externalId", "filingDate", "hearingLocation", "id", "judgeId", "lawyerId", "nextHearing", "plaintiff", "plaintiffAddress", "plaintiffAge", "priority", "prosecutorId", "status", "title", "type", "updatedAt") SELECT "createdAt", "defendant", "deletedAt", "description", "externalId", "filingDate", "hearingLocation", "id", "judgeId", "lawyerId", "nextHearing", "plaintiff", "plaintiffAddress", "plaintiffAge", "priority", "prosecutorId", "status", "title", "type", "updatedAt" FROM "Case";
DROP TABLE "Case";
ALTER TABLE "new_Case" RENAME TO "Case";
CREATE UNIQUE INDEX "Case_externalId_key" ON "Case"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
