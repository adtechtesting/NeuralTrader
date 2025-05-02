-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personalityType" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetFunding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualFunding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundingSuccess" BOOLEAN NOT NULL DEFAULT false,
    "fundingSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "socialInfluence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "emotionalVolatility" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "contraryOpinionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "technicalLanguageLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "mentions" TEXT[],
    "influence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fromAgentId" TEXT,
    "toAgentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationStats" (
    "id" TEXT NOT NULL,
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "successfullyFunded" INTEGER NOT NULL DEFAULT 0,
    "failedToFund" INTEGER NOT NULL DEFAULT 0,
    "totalFunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "personalityDistribution" JSONB,
    "occupationDistribution" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cache" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AgentState" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "lastAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDecision" JSONB,
    "lastMessage" JSONB,
    "state" JSONB,

    CONSTRAINT "AgentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_publicKey_key" ON "Agent"("publicKey");

-- CreateIndex
CREATE INDEX "Agent_personalityType_idx" ON "Agent"("personalityType");

-- CreateIndex
CREATE INDEX "Agent_messageFrequency_idx" ON "Agent"("messageFrequency");

-- CreateIndex
CREATE INDEX "Agent_socialInfluence_idx" ON "Agent"("socialInfluence");

-- CreateIndex
CREATE UNIQUE INDEX "Token_mintAddress_key" ON "Token"("mintAddress");

-- CreateIndex
CREATE INDEX "Token_symbol_idx" ON "Token"("symbol");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_sentiment_idx" ON "Message"("sentiment");

-- CreateIndex
CREATE INDEX "Message_type_idx" ON "Message"("type");

-- CreateIndex
CREATE INDEX "Message_visibility_idx" ON "Message"("visibility");

-- CreateIndex
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");

-- CreateIndex
CREATE INDEX "Reaction_agentId_idx" ON "Reaction"("agentId");

-- CreateIndex
CREATE INDEX "Reaction_type_idx" ON "Reaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_signature_key" ON "Transaction"("signature");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_fromAgentId_idx" ON "Transaction"("fromAgentId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Cache_expiresAt_idx" ON "Cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentState_agentId_key" ON "AgentState"("agentId");

-- CreateIndex
CREATE INDEX "AgentState_agentId_idx" ON "AgentState"("agentId");

-- CreateIndex
CREATE INDEX "AgentState_lastAction_idx" ON "AgentState"("lastAction");

-- CreateIndex
CREATE INDEX "TransactionLog_transactionId_idx" ON "TransactionLog"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionLog_timestamp_idx" ON "TransactionLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
