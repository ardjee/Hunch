export type AiProfileId = 'balanced' | 'risk_taker' | 'chaotic';

export interface AiProfile {
  id: AiProfileId;
  label: string;
  shortLabel: string;
  description: string;
  guessBias: number; // 0 (lower values) -> 1 (higher values)
  guessVariance: number; // 0-1 range for randomness
  aggression: number; // preference for high-impact roles like Thief/Judge
  voteChaos: number; // probability of voting randomly instead of analytically
  copycatTendency: number; // 0-1, willingness to repeat popular character choices
  prefersCharacters: string[];
  avoidsCharacters: string[];
}

