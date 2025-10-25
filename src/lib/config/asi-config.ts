/**
 * Environment Configuration for ASI Alliance Integration
 * Add these to your .env.local file
 */

export const ASI_CONFIG = {
  // Fetch.ai uAgents Configuration
  FETCHAI_ENABLED: process.env.NEXT_PUBLIC_FETCHAI_ENABLED === 'true',
  AGENTVERSE_URL: process.env.NEXT_PUBLIC_AGENTVERSE_URL || 'https://agentverse.ai',
  AGENTVERSE_API_KEY: process.env.AGENTVERSE_API_KEY,

  // SingularityNET MeTTa Knowledge Graph
  METTA_KNOWLEDGE_GRAPH_URL: process.env.METTA_KNOWLEDGE_GRAPH_URL,
  METTA_API_KEY: process.env.METTA_API_KEY,

  // Chat Protocol Configuration
  CHAT_PROTOCOL_ENABLED: process.env.NEXT_PUBLIC_CHAT_PROTOCOL_ENABLED === 'true',
  ASI_ONE_URL: process.env.NEXT_PUBLIC_ASI_ONE_URL || 'https://asi.one',

  // NeuralTrader ASI Integration
  NEUTRALTRADER_ASI_MODE: process.env.NEXT_PUBLIC_NEUTRALTRADER_ASI_MODE === 'true',
  HACKATHON_TRACK: process.env.NEXT_PUBLIC_HACKATHON_TRACK === 'true',

  // Agent Configuration
  MAX_ASI_AGENTS: parseInt(process.env.MAX_ASI_AGENTS || '10'),
  ASI_UPDATE_INTERVAL: parseInt(process.env.ASI_UPDATE_INTERVAL || '30000'), // 30 seconds
} as const;

/**
 * Feature flags for ASI integration
 */
export const ASI_FEATURES = {
  enabled: ASI_CONFIG.NEUTRALTRADER_ASI_MODE,
  fetchAI: ASI_CONFIG.FETCHAI_ENABLED,
  knowledgeGraph: !!ASI_CONFIG.METTA_KNOWLEDGE_GRAPH_URL,
  chatProtocol: ASI_CONFIG.CHAT_PROTOCOL_ENABLED,
  hackathon: ASI_CONFIG.HACKATHON_TRACK,
} as const;

/**
 * Validation function to check if ASI integration is properly configured
 */
export function validateASIConfiguration(): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (ASI_FEATURES.enabled) {
    if (!ASI_CONFIG.AGENTVERSE_API_KEY) {
      missing.push('AGENTVERSE_API_KEY');
    }

    if (ASI_FEATURES.knowledgeGraph && !ASI_CONFIG.METTA_API_KEY) {
      missing.push('METTA_API_KEY');
    }

    if (ASI_FEATURES.fetchAI && !ASI_CONFIG.AGENTVERSE_URL) {
      warnings.push('Using default Agentverse URL');
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}
