// src/lib/agents/personalities.ts

/**
 * Define agent personality types
 * These personalities determine how agents make trading decisions
 * and interact with other agents in the simulation
 */
export const PERSONALITIES = {
  CONSERVATIVE: "Conservative trader who prefers stable assets and minimal risk",
  AGGRESSIVE: "Aggressive trader who seeks high returns and is willing to take risks",
  TECHNICAL: "Technical analyst who trades based on chart patterns and indicators",
  FUNDAMENTAL: "Fundamental analyst who evaluates the intrinsic value of assets",
  EMOTIONAL: "Emotional trader who is easily influenced by market sentiment",
  CONTRARIAN: "Contrarian who tends to go against market trends",
  WHALE: "Large trader with significant capital who can influence market moves",
  NOVICE: "Inexperienced trader who is still learning the basics",
  MODERATE: "Moderate trader who takes a balanced approach to risk and reward",
  TREND_FOLLOWER: "Trend follower who follows market momentum",
} as const;

/**
 * Define the PersonalityType type for TypeScript
 */
export type PersonalityType = keyof typeof PERSONALITIES;

/**
 * Define personality behavior settings interface
 */
interface PersonalityBehavior {
  tradeFrequency: number;
  riskTolerance: number;
  positionSize: number;
  decisionThreshold: number;
  messageFrequency: number;
  socialInfluence: number;
  analysisDepth: number;
  tradeDescriptions: string[];
}

/**
 * Personality-specific behavior settings
 * These values control various aspects of agent behavior in the simulation
 */
export const PERSONALITY_BEHAVIORS: Record<PersonalityType, PersonalityBehavior> = {
  CONSERVATIVE: {
    tradeFrequency: 0.2,
    riskTolerance: 0.1,
    positionSize: 0.1,
    decisionThreshold: 0.7,
    messageFrequency: 0.3,
    socialInfluence: 0.4,
    analysisDepth: 0.8,
    tradeDescriptions: [
      "Making a careful investment after thorough analysis",
      "Taking a measured position with strict risk management",
      "Adding a small allocation to a fundamentally sound token",
      "Cautiously entering at what appears to be a support level",
      "Making a calculated entry after confirmation of trend"
    ]
  },
  
  AGGRESSIVE: {
    tradeFrequency: 0.7,
    riskTolerance: 0.8,
    positionSize: 0.5,
    decisionThreshold: 0.3,
    messageFrequency: 0.6,
    socialInfluence: 0.7,
    analysisDepth: 0.4,
    tradeDescriptions: [
      "Taking a large position based on strong momentum",
      "Making an aggressive entry at a key level",
      "Going all in on this high-conviction trade",
      "Taking a significant position to maximize gains",
      "Making a bold move based on market signals"
    ]
  },
  
  TECHNICAL: {
    tradeFrequency: 0.5,
    riskTolerance: 0.4,
    positionSize: 0.3,
    decisionThreshold: 0.5,
    messageFrequency: 0.4,
    socialInfluence: 0.5,
    analysisDepth: 0.9,
    tradeDescriptions: [
      "Entering based on bullish chart pattern",
      "Taking position at key technical level",
      "Following technical indicators for entry",
      "Trading based on chart analysis",
      "Making a technical-based entry"
    ]
  },
  
  FUNDAMENTAL: {
    tradeFrequency: 0.3,
    riskTolerance: 0.3,
    positionSize: 0.2,
    decisionThreshold: 0.6,
    messageFrequency: 0.5,
    socialInfluence: 0.6,
    analysisDepth: 0.9,
    tradeDescriptions: [
      "Investing based on strong fundamentals",
      "Taking position after thorough research",
      "Making a value-based investment",
      "Entering based on project metrics",
      "Investing in fundamentally sound token"
    ]
  },
  
  EMOTIONAL: {
    tradeFrequency: 0.6,
    riskTolerance: 0.5,
    positionSize: 0.4,
    decisionThreshold: 0.4,
    messageFrequency: 0.7,
    socialInfluence: 0.3,
    analysisDepth: 0.3,
    tradeDescriptions: [
      "Feeling confident about this trade",
      "Going with my gut on this one",
      "Taking a position based on market mood",
      "Making an emotional decision to trade",
      "Following my instincts on this move"
    ]
  },
  
  CONTRARIAN: {
    tradeFrequency: 0.4,
    riskTolerance: 0.6,
    positionSize: 0.3,
    decisionThreshold: 0.5,
    messageFrequency: 0.5,
    socialInfluence: 0.5,
    analysisDepth: 0.7,
    tradeDescriptions: [
      "Going against the crowd on this one",
      "Taking a contrarian position",
      "Buying when others are selling",
      "Selling when others are buying",
      "Making a counter-trend trade"
    ]
  },
  
  WHALE: {
    tradeFrequency: 0.2,
    riskTolerance: 0.7,
    positionSize: 0.8,
    decisionThreshold: 0.4,
    messageFrequency: 0.2,
    socialInfluence: 0.8,
    analysisDepth: 0.6,
    tradeDescriptions: [
      "Making a significant market move",
      "Taking a whale-sized position",
      "Executing a large-scale trade",
      "Making a market-moving investment",
      "Taking a position that could influence price"
    ]
  },
  
  NOVICE: {
    tradeFrequency: 0.3,
    riskTolerance: 0.2,
    positionSize: 0.1,
    decisionThreshold: 0.8,
    messageFrequency: 0.4,
    socialInfluence: 0.2,
    analysisDepth: 0.3,
    tradeDescriptions: [
      "Trying my first trade",
      "Making a small test position",
      "Learning to trade with this move",
      "Taking a cautious first step",
      "Making a beginner's trade"
    ]
  },
  
  MODERATE: {
    tradeFrequency: 0.4,
    riskTolerance: 0.4,
    positionSize: 0.2,
    decisionThreshold: 0.5,
    messageFrequency: 0.4,
    socialInfluence: 0.4,
    analysisDepth: 0.6,
    tradeDescriptions: [
      "Taking a balanced position",
      "Making a moderate trade",
      "Entering with measured risk",
      "Taking a middle-ground approach",
      "Making a calculated moderate move"
    ]
  },
  
  TREND_FOLLOWER: {
    tradeFrequency: 0.5,
    riskTolerance: 0.3,
    positionSize: 0.3,
    decisionThreshold: 0.4,
    messageFrequency: 0.5,
    socialInfluence: 0.4,
    analysisDepth: 0.5,
    tradeDescriptions: [
      "Following the trend with this trade",
      "Riding the momentum",
      "Going with the market flow",
      "Following the trend direction",
      "Making a trend-following move"
    ]
  }
};

/**
 * Get a random trade description for a given personality type
 */
export function getRandomTradeDescription(personalityType: PersonalityType): string {
  const behavior = PERSONALITY_BEHAVIORS[personalityType];
  const descriptions = behavior.tradeDescriptions;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Get behavior settings for a given personality type
 */
export function getPersonalityBehavior(personalityType: PersonalityType): PersonalityBehavior {
  return PERSONALITY_BEHAVIORS[personalityType];
}