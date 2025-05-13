export const PERSONALITIES = {
  ANALYTICAL: 'analytical',
  CREATIVE: 'creative',
  SOCIAL: 'social',
  STRATEGIC: 'strategic',
} as const;

export type PersonalityType = keyof typeof PERSONALITIES;


export const LLM_PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  ANTHROPIC: 'anthropic',
  MISTRAL: 'mistral',
  LOCAL: 'local',
} as const;

export type LLMProviderType = keyof typeof LLM_PROVIDERS;

export class AgentManager {
  public name: string;
  public personality: string;
  public personalityType: PersonalityType;
  public publicKey: string
  public privateKey: string;
  public walletBalance: number;
  public llmProvider: string;

  private constructor(
    name: string,
    personalityType: PersonalityType,
    publicKey: string,
    privateKey: string,
    llmProvider: string
  ) {
    this.name = name;
    this.personalityType = personalityType;
    this.personality = PERSONALITIES[personalityType];
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.walletBalance = 0;
    this.llmProvider = llmProvider;
  }

  public static async create(
    name: string, 
    personalityType: PersonalityType, 
    llmProvider: string = LLM_PROVIDERS.OPENAI
  ): Promise<AgentManager> {
    // Generate a mock public/private key pair for now
    const publicKey = `pk_${Math.random().toString(36).substring(2, 15)}`;
    const privateKey = `sk_${Math.random().toString(36).substring(2, 15)}`;

    return new AgentManager(name, personalityType, publicKey, privateKey, llmProvider);
  }
} 