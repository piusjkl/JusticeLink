-- JUSTICELINK pilot access-to-justice layer

CREATE TABLE "CitizenProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "fullName" TEXT,
    "district" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "lowLiteracy" BOOLEAN NOT NULL DEFAULT false,
    "disabilityNeeds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CitizenProfile_phone_key" ON "CitizenProfile"("phone");

CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingCode" TEXT NOT NULL,
    "citizenId" TEXT,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "district" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "incidentLocation" TEXT,
    "consentToShare" BOOLEAN NOT NULL DEFAULT true,
    "safetyFlag" BOOLEAN NOT NULL DEFAULT false,
    "offlineClientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Complaint_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Complaint_trackingCode_key" ON "Complaint"("trackingCode");

CREATE TABLE "ComplaintStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "complaintId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'system',
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplaintStatusEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ComplaintStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TriageResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "complaintId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "language" TEXT NOT NULL,
    "recommendedInstitutionType" TEXT NOT NULL,
    "referralReasonCodes" TEXT NOT NULL,
    "safetyFlags" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TriageResult_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TriageResult_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TriageResult_complaintId_key" ON "TriageResult"("complaintId");

CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT,
    "contact" TEXT,
    "supportsEmergency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

CREATE TABLE "LegalAidProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "district" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "services" TEXT,
    "supportsWomen" BOOLEAN NOT NULL DEFAULT false,
    "supportsYouth" BOOLEAN NOT NULL DEFAULT false,
    "supportsPwd" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LegalAidProvider_name_key" ON "LegalAidProvider"("name");

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "complaintId" TEXT NOT NULL,
    "institutionId" TEXT,
    "legalAidProviderId" TEXT,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "reasonCodes" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "escalatedAt" DATETIME,
    "closedAt" DATETIME,
    CONSTRAINT "Referral_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Referral_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Referral_legalAidProviderId_fkey" FOREIGN KEY ("legalAidProviderId") REFERENCES "LegalAidProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Referral_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "USSDSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "payload" TEXT,
    "complaintId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    CONSTRAINT "USSDSession_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "USSDSession_sessionId_key" ON "USSDSession"("sessionId");

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "complaintId" TEXT,
    "phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalRef" TEXT,
    "waiverReason" TEXT,
    "callbackPayload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentTransaction_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentTransaction_externalRef_key" ON "PaymentTransaction"("externalRef");

CREATE TABLE "RegistryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "complaintId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventHash" TEXT NOT NULL,
    "previousHash" TEXT,
    "fabricTxId" TEXT,
    "fabricStatus" TEXT NOT NULL DEFAULT 'local_only',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistryEntry_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RegistryEntry_eventHash_key" ON "RegistryEntry"("eventHash");

CREATE TABLE "PartnerOrg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "PartnerOrg_name_key" ON "PartnerOrg"("name");

CREATE TABLE "PartnerApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerApiToken_partnerOrgId_fkey" FOREIGN KEY ("partnerOrgId") REFERENCES "PartnerOrg" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartnerApiToken_tokenHash_key" ON "PartnerApiToken"("tokenHash");
