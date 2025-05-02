export const PERSONALITIES = {
  ANALYTICAL: 'analytical',
  CREATIVE: 'creative',
  SOCIAL: 'social',
  STRATEGIC: 'strategic',
} as const;

export type PersonalityType = keyof typeof PERSONALITIES;

export class AgentManager {
  public name: string;
  public personality: string;
  public personalityType: PersonalityType;
  public publicKey: string;
  public privateKey: string;
  public walletBalance: number;

  private constructor(
    name: string,
    personalityType: PersonalityType,
    publicKey: string,
    privateKey: string
  ) {
    this.name = name;
    this.personalityType = personalityType;
    this.personality = PERSONALITIES[personalityType];
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.walletBalance = 0;
  }

  public static async create(name: string, personalityType: PersonalityType): Promise<AgentManager> {
    // Generate a mock public/private key pair for now
    const publicKey = `pk_${Math.random().toString(36).substring(2, 15)}`;
    const privateKey = `sk_${Math.random().toString(36).substring(2, 15)}`;

    return new AgentManager(name, personalityType, publicKey, privateKey);
  }
} 