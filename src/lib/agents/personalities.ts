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
};

/**
 * Define the PersonalityType type for TypeScript
 */
export type PersonalityType = keyof typeof PERSONALITIES;

/**
 * Personality-specific behavior settings
 * These values control various aspects of agent behavior in the simulation
 */
export const PERSONALITY_BEHAVIORS = {
  CONSERVATIVE: {
    tradeFrequency: 0.2,     // How often they trade (0-1)
    riskTolerance: 0.1,      // How much risk they'll take (0-1)
    positionSize: 0.1,       // Percentage of holdings in each trade
    decisionThreshold: 0.7,  // Strength of signal needed to trade (0-1)
    messageFrequency: 0.3,   // How often they post messages (0-1)
    socialInfluence: 0.4,    // How much they influence others (0-1)
    analysisDepth: 0.8,      // How thoroughly they analyze (0-1)
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
    positionSize: 0.3,
    decisionThreshold: 0.3,
    messageFrequency: 0.7,
    socialInfluence: 0.6,
    analysisDepth: 0.4,
    tradeDescriptions: [
      "Going ALL IN on this massive opportunity!",
      "Taking a leveraged position for maximum gains",
      "Betting big on this breakout pattern",
      "Making a high-conviction play on this setup",
      "Doubling down on this perfect entry point"
    ]
  },
  
  TECHNICAL: {
    tradeFrequency: 0.5,
    riskTolerance: 0.5,
    positionSize: 0.2,
    decisionThreshold: 0.6,
    messageFrequency: 0.5,
    socialInfluence: 0.7,
    analysisDepth: 0.7,
    tradeDescriptions: [
      "Entering based on the MACD crossover and RSI confirmation",
      "Trading the breakout from this descending triangle pattern",
      "Taking position after the golden cross on the 4H chart",
      "Buying at support with multiple technical indicators aligned",
      "Selling at resistance with bearish divergence on oscillators"
    ]
  },
  
  FUNDAMENTAL: {
    tradeFrequency: 0.3,
    riskTolerance: 0.4,
    positionSize: 0.25,
    decisionThreshold: 0.65,
    messageFrequency: 0.4,
    socialInfluence: 0.6,
    analysisDepth: 0.9,
    tradeDescriptions: [
      "Investing based on strong tokenomics and utility metrics",
      "Taking a position after analyzing the project's roadmap progress",
      "Buying based on the token's superior value proposition",
      "Allocating funds after thorough analysis of adoption metrics",
      "Adding exposure based on growing network effects and user metrics"
    ]
  },
  
  EMOTIONAL: {
    tradeFrequency: 0.7,
    riskTolerance: 0.7,
    positionSize: 0.3,
    decisionThreshold: 0.2,
    messageFrequency: 0.9,
    socialInfluence: 0.3,
    analysisDepth: 0.2,
    tradeDescriptions: [
      "I just have this amazing feeling about this token right now!",
      "I can't believe the price, I'm buying more while I still can!",
      "Everyone's talking about this - I don't want to miss out!",
      "This looks scary but I'm trusting my gut and going for it!",
      "I'm getting nervous about my position so I'm selling some now"
    ]
  },
  
  CONTRARIAN: {
    tradeFrequency: 0.4,
    riskTolerance: 0.6,
    positionSize: 0.2,
    decisionThreshold: 0.5,
    messageFrequency: 0.5,
    socialInfluence: 0.4,
    analysisDepth: 0.6,
    tradeDescriptions: [
      "Going against the herd while everyone else is panicking",
      "Taking the opposite side of this crowded trade",
      "Buying while there's blood in the streets",
      "Selling into strength while everyone else is euphoric",
      "Taking profit while others are still chasing gains"
    ]
  },
  
  WHALE: {
    tradeFrequency: 0.2,
    riskTolerance: 0.6,
    positionSize: 0.4,
    decisionThreshold: 0.6,
    messageFrequency: 0.3,
    socialInfluence: 0.9,
    analysisDepth: 0.8,
    tradeDescriptions: [
      "Initiating a major position according to our investment thesis",
      "Strategically accumulating at current levels",
      "Beginning to build our exposure to this asset class",
      "Executing a planned reduction in our position size",
      "Liquidating a portion of holdings to rebalance our portfolio"
    ]
  },
  
  NOVICE: {
    tradeFrequency: 0.6,
    riskTolerance: 0.7,
    positionSize: 0.4,
    decisionThreshold: 0.3,
    messageFrequency: 0.6,
    socialInfluence: 0.2,
    analysisDepth: 0.3,
    tradeDescriptions: [
      "Just bought my first tokens! Am I doing this right?",
      "Taking a chance on this one because the chart looks good!",
      "Buying some more since it's dipping. That's what you do, right?",
      "Selling now to lock in profits. Better safe than sorry!",
      "Not sure what's happening but everyone seems to be buying so I am too!"
    ]
  },
  
  MODERATE: {
    tradeFrequency: 0.5,     // Balanced trading frequency
    riskTolerance: 0.5,      // Moderate risk tolerance  
    positionSize: 0.2,       // Standard position size
    decisionThreshold: 0.5,  // Average decision threshold
    messageFrequency: 0.5,   // Average message frequency
    socialInfluence: 0.5,    // Moderate social influence
    analysisDepth: 0.6,      // Good analysis but not obsessive
    tradeDescriptions: [
      "Making a balanced investment based on risk/reward analysis",
      "Taking a reasonable position with moderate risk exposure",
      "Adding to my portfolio after considering both fundamentals and technicals",
      "Entering a position with a clear strategy for both profit and loss",
      "Executing a trade with a moderate time horizon in mind"
    ]
  },
  
  TREND_FOLLOWER: {
    tradeFrequency: 0.6,     // Follows trends actively
    riskTolerance: 0.6,      // Moderate-high risk tolerance
    positionSize: 0.25,      // Slightly larger positions
    decisionThreshold: 0.4,  // Acts on clearer trends
    messageFrequency: 0.6,   // Actively discusses trends
    socialInfluence: 0.6,    // Moderate-high influence
    analysisDepth: 0.7,      // Focuses deeply on trend indicators
    tradeDescriptions: [
      "Following the confirmed uptrend with strong momentum",
      "Riding the wave of this clearly established market direction",
      "Entering as the trend gains strength and volume confirms",
      "Moving with the market flow as indicators align positively",
      "Exiting as the trend weakens and momentum indicators roll over"
    ]
  }
};

/**
 * Get a random trade description for a given personality
 */
export function getRandomTradeDescription(personalityType: PersonalityType | string): string {
  const personality = PERSONALITY_BEHAVIORS[personalityType as PersonalityType] || PERSONALITY_BEHAVIORS.CONSERVATIVE;
  const descriptions = personality.tradeDescriptions;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Get appropriate behavior settings for a personality type
 */
export function getPersonalityBehavior(personalityType: PersonalityType | string) {
  return PERSONALITY_BEHAVIORS[personalityType as PersonalityType] || PERSONALITY_BEHAVIORS.CONSERVATIVE;
}