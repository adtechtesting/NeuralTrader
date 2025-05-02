-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PoolState" (
    "id" TEXT NOT NULL,
    "solAmount" DOUBLE PRECISION NOT NULL,
    "tokenAmount" DOUBLE PRECISION NOT NULL,
    "k" DOUBLE PRECISION NOT NULL,
    "tradingVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradingVolume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceHistory" TEXT NOT NULL,
    "trades" TEXT NOT NULL,

    CONSTRAINT "PoolState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" JSONB,
    "agentId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimulationLog_event_idx" ON "SimulationLog"("event");

-- CreateIndex
CREATE INDEX "SimulationLog_timestamp_idx" ON "SimulationLog"("timestamp");

-- CreateIndex
CREATE INDEX "SimulationLog_agentId_idx" ON "SimulationLog"("agentId");

-- CreateIndex
CREATE INDEX "AgentAction_agentId_idx" ON "AgentAction"("agentId");

-- CreateIndex
CREATE INDEX "AgentAction_actionType_idx" ON "AgentAction"("actionType");

-- CreateIndex
CREATE INDEX "AgentAction_timestamp_idx" ON "AgentAction"("timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "Agent_active_idx" ON "Agent"("active");
