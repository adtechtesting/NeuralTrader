-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "lastActive" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "MarketState" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "liquidity" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL,
    "transactions24h" INTEGER NOT NULL,
    "priceChange24h" DOUBLE PRECISION NOT NULL,
    "historicalPrices" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.05,

    CONSTRAINT "MarketState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationReport" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SimulationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketState_timestamp_idx" ON "MarketState"("timestamp");

-- CreateIndex
CREATE INDEX "SimulationReport_timestamp_idx" ON "SimulationReport"("timestamp");

-- CreateIndex
CREATE INDEX "SimulationReport_isFinal_idx" ON "SimulationReport"("isFinal");

-- CreateIndex
CREATE INDEX "Agent_lastActive_idx" ON "Agent"("lastActive");
