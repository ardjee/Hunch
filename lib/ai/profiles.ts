import { AiProfile, AiProfileId } from './types';

export const DEFAULT_AI_PROFILE_ID: AiProfileId = 'balanced';

export const AI_PROFILES: AiProfile[] = [
  {
    id: 'balanced',
    label: 'Evenhanded Analyst',
    shortLabel: 'Analyst',
    description: 'Prefers steady play, mixes safe characters with occasional risks.',
    guessBias: 0.55,
    guessVariance: 0.35,
    aggression: 0.45,
    voteChaos: 0.1,
    copycatTendency: 0.4,
    prefersCharacters: ['merchant', 'judge', 'magician'],
    avoidsCharacters: ['peasant'],
  },
  {
    id: 'risk_taker',
    label: 'Bold Tactician',
    shortLabel: 'Tactician',
    description: 'Chases high-impact roles and big swings, often targets popular picks.',
    guessBias: 0.65,
    guessVariance: 0.5,
    aggression: 0.85,
    voteChaos: 0.15,
    copycatTendency: 0.2,
    prefersCharacters: ['thief', 'monarch', 'magician'],
    avoidsCharacters: ['saint'],
  },
  {
    id: 'chaotic',
    label: 'Chaotic Muse',
    shortLabel: 'Muse',
    description: 'Embraces randomness, keeps humans guessing with unpredictable plays.',
    guessBias: 0.5,
    guessVariance: 0.8,
    aggression: 0.6,
    voteChaos: 0.4,
    copycatTendency: 0.7,
    prefersCharacters: ['trickster', 'decoy', 'peasant'],
    avoidsCharacters: [],
  },
];

export const AI_NAME_POOL = [
  'Astra',
  'Nova',
  'Orion',
  'Lyra',
  'Echo',
  'Quill',
  'Rune',
  'Sora',
  'Atlas',
  'Drift',
  'Ember',
  'Iris',
  'Marin',
  'Nyx',
  'Pax',
  'Quinn',
  'Riven',
  'Sol',
  'Vega',
  'Zephyr',
];

export function getAiProfile(profileId?: AiProfileId | null): AiProfile {
  if (!profileId) return AI_PROFILES[0];
  return AI_PROFILES.find((profile) => profile.id === profileId) ?? AI_PROFILES[0];
}

export function generateAiScreenName(existingNames: string[], profile?: AiProfile): string {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));

  const baseName =
    AI_NAME_POOL.find((name) => !taken.has(name.toLowerCase())) ??
    `Bot ${existingNames.length + 1}`;

  const prefix = profile?.shortLabel || 'Bot';
  let candidate = `${prefix} ${baseName}`;

  if (!taken.has(candidate.toLowerCase())) {
    return candidate;
  }

  let suffix = 2;
  while (taken.has(`${candidate} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }

  return `${candidate} ${suffix}`;
}

