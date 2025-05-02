-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "maxPositionSize" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
ADD COLUMN     "riskTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "tokenBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tradeFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0.5;

-- AlterTable
ALTER TABLE "AgentState" ADD COLUMN     "context" TEXT,
ADD COLUMN     "lastMarketAnalysis" TIMESTAMP(3),
ADD COLUMN     "lastSocialAction" TIMESTAMP(3),
ADD COLUMN     "lastTradeDecision" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MarketState" ADD COLUMN     "cacheVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "data" JSONB,
ADD COLUMN     "lastPriceUpdate" TIMESTAMP(3),
ADD COLUMN     "lastVolumeUpdate" TIMESTAMP(3),
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "sentimentScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PoolState" ADD COLUMN     "cacheVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "highPrice24h" DOUBLE PRECISION,
ADD COLUMN     "lastTradedAt" TIMESTAMP(3),
ADD COLUMN     "lowPrice24h" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SimulationLog" ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'INFO',
ADD COLUMN     "message" TEXT,
ADD COLUMN     "simulationId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "details" JSONB,
ADD COLUMN     "fee" DOUBLE PRECISION,
ADD COLUMN     "priceImpact" DOUBLE PRECISION,
ADD COLUMN     "tokenAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Trading" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "successfulTrades" INTEGER NOT NULL DEFAULT 0,
    "failedTrades" INTEGER NOT NULL DEFAULT 0,
    "profitLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STOPPED',
    "currentPhase" TEXT NOT NULL DEFAULT 'MARKET_ANALYSIS',
    "agentCount" INTEGER NOT NULL,
    "activeAgents" INTEGER NOT NULL DEFAULT 0,
    "completedPhases" INTEGER NOT NULL DEFAULT 0,
    "phaseStartedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "configuration" JSONB,
    "simulationSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trading_agentId_key" ON "Trading"("agentId");

-- CreateIndex
CREATE INDEX "Trading_agentId_idx" ON "Trading"("agentId");

-- CreateIndex
CREATE INDEX "Trading_profitLoss_idx" ON "Trading"("profitLoss");

-- CreateIndex
CREATE INDEX "Simulation_status_idx" ON "Simulation"("status");

-- CreateIndex
CREATE INDEX "Simulation_startedAt_idx" ON "Simulation"("startedAt");

-- CreateIndex
CREATE INDEX "Simulation_currentPhase_idx" ON "Simulation"("currentPhase");

-- CreateIndex
CREATE INDEX "Agent_riskTolerance_idx" ON "Agent"("riskTolerance");

-- CreateIndex
CREATE INDEX "Agent_tradeFrequency_idx" ON "Agent"("tradeFrequency");

-- CreateIndex
CREATE INDEX "Agent_createdAt_idx" ON "Agent"("createdAt");

-- CreateIndex
CREATE INDEX "MarketState_type_idx" ON "MarketState"("type");

-- CreateIndex
CREATE INDEX "PoolState_lastUpdated_idx" ON "PoolState"("lastUpdated");

-- CreateIndex
CREATE INDEX "SimulationLog_simulationId_idx" ON "SimulationLog"("simulationId");

-- CreateIndex
CREATE INDEX "SimulationLog_level_idx" ON "SimulationLog"("level");

-- CreateIndex
CREATE INDEX "Transaction_signature_idx" ON "Transaction"("signature");

-- AddForeignKey
ALTER TABLE "AgentState" ADD CONSTRAINT "AgentState_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trading" ADD CONSTRAINT "Trading_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationLog" ADD CONSTRAINT "SimulationLog_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
