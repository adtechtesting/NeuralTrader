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
/**
 * Enhanced personality-specific behavior settings with sophisticated strategies
 */
export const PERSONALITY_BEHAVIORS: Record<PersonalityType, PersonalityBehavior> = {
  CONSERVATIVE: {
    tradeFrequency: 0.15, // Very low - only trades when highly confident
    riskTolerance: 0.05, // Very low risk tolerance
    positionSize: 0.05, // Very small positions (5% of balance max)
    decisionThreshold: 0.85, // Needs 85%+ confidence to trade
    messageFrequency: 0.25, // Low communication
    socialInfluence: 0.3, // Low influence on others
    analysisDepth: 0.95, // Very thorough analysis
    tradeDescriptions: [
      "Making a highly conservative allocation after extensive due diligence",
      "Taking a minimal position with triple confirmation signals",
      "Adding a tiny allocation to a fundamentally superior project",
      "Making an ultra-safe entry at a major support level",
      "Taking a conservative position after months of analysis"
    ]
  },

  MODERATE: {
    tradeFrequency: 0.4, // Balanced frequency
    riskTolerance: 0.4, // Moderate risk tolerance
    positionSize: 0.25, // Moderate position sizes
    decisionThreshold: 0.6, // Needs 60%+ confidence
    messageFrequency: 0.45, // Moderate communication
    socialInfluence: 0.5, // Moderate influence
    analysisDepth: 0.7, // Good analysis depth
    tradeDescriptions: [
      "Taking a balanced position after thorough analysis",
      "Making a calculated trade with proper risk management",
      "Adding a moderate allocation to a well-researched opportunity",
      "Taking a measured position at a key technical level",
      "Making a balanced move based on multiple confirmations"
    ]
  },

  AGGRESSIVE: {
    tradeFrequency: 0.75, // High frequency - trades often
    riskTolerance: 0.9, // Very high risk tolerance
    positionSize: 0.7, // Large positions (up to 70% of balance)
    decisionThreshold: 0.25, // Only needs 25% confidence
    messageFrequency: 0.7, // High communication
    socialInfluence: 0.8, // High influence on others
    analysisDepth: 0.3, // Quick, shallow analysis
    tradeDescriptions: [
      "Taking an aggressive position based on strong momentum",
      "Making a bold entry at a key breakout level",
      "Going big on this high-conviction opportunity",
      "Taking a massive position to maximize gains",
      "Making an aggressive move based on market signals"
    ]
  },

  TREND_FOLLOWER: {
    tradeFrequency: 0.6, // Follows trends actively
    riskTolerance: 0.35, // Moderate risk tolerance
    positionSize: 0.4, // Moderate to large positions
    decisionThreshold: 0.4, // Needs clear trend confirmation
    messageFrequency: 0.55, // Moderate-high communication
    socialInfluence: 0.45, // Moderate influence
    analysisDepth: 0.6, // Good trend analysis
    tradeDescriptions: [
      "Following the strong uptrend with this trade",
      "Riding the momentum wave",
      "Going with the clear market direction",
      "Following the trend confirmation signals",
      "Making a trend-following move with the flow"
    ]
  },

  CONTRARIAN: {
    tradeFrequency: 0.45, // Trades when others are wrong
    riskTolerance: 0.65, // Higher risk tolerance for counter-trades
    positionSize: 0.35, // Moderate positions
    decisionThreshold: 0.45, // Needs good setup against crowd
    messageFrequency: 0.5, // Moderate communication
    socialInfluence: 0.4, // Moderate influence
    analysisDepth: 0.75, // Deep sentiment analysis
    tradeDescriptions: [
      "Going against the crowd on this over-hyped move",
      "Taking a contrarian position when sentiment is extreme",
      "Buying when panic selling is peaking",
      "Selling when euphoric buying is climaxing",
      "Making a counter-trend trade based on sentiment analysis"
    ]
  },

  TECHNICAL: {
    tradeFrequency: 0.55, // Trades based on chart patterns
    riskTolerance: 0.4, // Moderate risk tolerance
    positionSize: 0.3, // Moderate positions
    decisionThreshold: 0.5, // Needs clear technical setup
    messageFrequency: 0.4, // Moderate communication
    socialInfluence: 0.55, // Moderate-high influence
    analysisDepth: 0.95, // Deep technical analysis
    tradeDescriptions: [
      "Entering based on perfect chart pattern setup",
      "Taking position at key technical resistance breakout",
      "Following technical indicators for precise entry",
      "Trading based on pure chart analysis",
      "Making a technical-based entry at support level"
    ]
  },

  FUNDAMENTAL: {
    tradeFrequency: 0.25, // Low frequency - long-term holds
    riskTolerance: 0.3, // Low-moderate risk tolerance
    positionSize: 0.2, // Smaller long-term positions
    decisionThreshold: 0.7, // Needs strong fundamentals
    messageFrequency: 0.4, // Moderate communication
    socialInfluence: 0.7, // High influence due to expertise
    analysisDepth: 0.95, // Deep fundamental analysis
    tradeDescriptions: [
      "Investing based on superior fundamentals and tokenomics",
      "Taking position after comprehensive project research",
      "Making a value-based investment in strong team",
      "Entering based on excellent roadmap and adoption",
      "Investing in fundamentally superior project"
    ]
  },

  EMOTIONAL: {
    tradeFrequency: 0.65, // High frequency due to impulses
    riskTolerance: 0.5, // Moderate risk tolerance
    positionSize: 0.35, // Moderate positions
    decisionThreshold: 0.35, // Low threshold due to emotions
    messageFrequency: 0.8, // Very high communication
    socialInfluence: 0.25, // Low influence - emotional
    analysisDepth: 0.2, // Shallow, emotion-driven analysis
    tradeDescriptions: [
      "Feeling really confident about this trade",
      "Going with my gut on this market move",
      "Taking a position based on the current market mood",
      "Making an emotional decision to trade now",
      "Following my instincts on this opportunity"
    ]
  },

  WHALE: {
    tradeFrequency: 0.15, // Low frequency - strategic timing
    riskTolerance: 0.8, // High risk tolerance due to capital
    positionSize: 0.9, // Very large positions
    decisionThreshold: 0.3, // Lower threshold due to influence
    messageFrequency: 0.2, // Low communication - mysterious
    socialInfluence: 0.95, // Very high influence
    analysisDepth: 0.8, // Deep analysis due to stakes
    tradeDescriptions: [
      "Making a market-moving strategic allocation",
      "Taking a whale-sized position to establish presence",
      "Executing a large-scale trade to influence price",
      "Making a significant market impact investment",
      "Taking a position that will move the market"
    ]
  },

  NOVICE: {
    tradeFrequency: 0.3, // Low frequency - learning
    riskTolerance: 0.15, // Very low risk tolerance
    positionSize: 0.08, // Very small test positions
    decisionThreshold: 0.8, // Needs high confidence
    messageFrequency: 0.6, // High communication - asking questions
    socialInfluence: 0.15, // Low influence - learning
    analysisDepth: 0.4, // Learning analysis depth
    tradeDescriptions: [
      "Making my first real trade to learn",
      "Taking a small test position to gain experience",
      "Learning to trade with this small move",
      "Taking a cautious first step into trading",
      "Making a beginner's trade to build confidence"
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