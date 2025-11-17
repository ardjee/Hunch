import type { Player, PlayerCharacterSelection } from '@/lib/types';
import { AiProfile } from './types';
import { getAiProfile } from './profiles';

interface HunchContext {
  profileId?: string | null;
  challengeDescription: string | null;
  currentDay: number;
}

interface VoteContext {
  profileId?: string | null;
  actualResult: string | null;
  submittedHunches?: Record<string, string> | null;
  players: Player[];
}

interface CharacterSelectionContext {
  profileId?: string | null;
  availableCharacterIds: string[];
  selectionsForDay?: Record<string, PlayerCharacterSelection>;
  forcedCharacterId?: string;
}

interface JudgeContext {
  players: Player[];
}

interface MagicianContext {
  profileId?: string | null;
  players: Player[];
  availableCharacterIds: string[];
  selfId: string;
}

const DEFAULT_RANGE = { min: 10, max: 120 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extractNumericRange(description: string | null | undefined): { min: number; max: number } {
  if (!description) {
    return DEFAULT_RANGE;
  }

  const matches = description.match(/-?\d+(\.\d+)?/g);
  const numbers = matches?.map((token) => Number(token)).filter((value) => Number.isFinite(value)) ?? [];

  if (numbers.length >= 2) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    if (min === max) {
      return { min: min * 0.5, max: max * 1.5 };
    }
    return { min, max };
  }

  if (numbers.length === 1) {
    const base = numbers[0];
    return {
      min: Math.max(0, base * 0.6),
      max: Math.max(base * 1.4, base + 25),
    };
  }

  return DEFAULT_RANGE;
}

function pickWeightedOption(options: Array<{ id: string; weight: number }>): string | null {
  const total = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0);
  if (total <= 0) return null;
  const target = Math.random() * total;
  let cumulative = 0;
  for (const option of options) {
    cumulative += Math.max(0, option.weight);
    if (target <= cumulative) {
      return option.id;
    }
  }
  return options[options.length - 1]?.id ?? null;
}

export function generateAiHunch(context: HunchContext): string {
  const profile = getAiProfile(context.profileId);
  const { min, max } = extractNumericRange(context.challengeDescription);
  const span = Math.max(10, max - min);
  const biasPoint = min + span * clamp(profile.guessBias, 0, 1);
  const varianceRange = span * (0.15 + profile.guessVariance * 0.35);
  const varianceJitter = (Math.random() - 0.5) * 2 * varianceRange;
  let guess = biasPoint + varianceJitter;

  if (!Number.isFinite(guess)) {
    guess = (min + max) / 2;
  }

  if (guess < 0) {
    guess = Math.abs(guess) * 0.35;
  }

  // Slight day-based adjustment to keep guesses evolving
  guess += Math.sin(context.currentDay) * profile.guessVariance * 5;

  const precision = span > 200 ? 0 : 1;
  return guess.toFixed(precision);
}

export function pickAiVote(context: VoteContext): string | null {
  const profile = getAiProfile(context.profileId);
  if (!context.players.length) return null;

  const actualValue = context.actualResult ? Number(context.actualResult) : null;
  const submitted = context.submittedHunches ?? {};

  if (!Number.isFinite(actualValue) || Math.random() < profile.voteChaos) {
    const eligible = context.players.filter((player) => submitted[player.id]);
    const pool = eligible.length ? eligible : context.players;
    return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
  }

  const scoredPlayers = context.players
    .map((player) => {
      const hunch = submitted[player.id];
      const parsed = hunch ? Number(hunch) : NaN;
      const difference = Number.isFinite(parsed) ? Math.abs(parsed - (actualValue as number)) : Number.POSITIVE_INFINITY;
      return {
        playerId: player.id,
        difference,
      };
    })
    .filter((entry) => Number.isFinite(entry.difference));

  if (!scoredPlayers.length) {
    const fallbackPool = context.players[Math.floor(Math.random() * context.players.length)];
    return fallbackPool?.id ?? null;
  }

  const bestDifference = Math.min(...scoredPlayers.map((entry) => entry.difference));
  const finalists = scoredPlayers.filter((entry) => entry.difference === bestDifference);

  return finalists[Math.floor(Math.random() * finalists.length)]?.playerId ?? null;
}

export function pickAiCharacterSelection(context: CharacterSelectionContext): PlayerCharacterSelection | null {
  const profile = getAiProfile(context.profileId);
  const forced = context.forcedCharacterId;
  if (forced) {
    return { characterId: forced };
  }

  const available = context.availableCharacterIds.length ? context.availableCharacterIds : ['peasant'];
  const selections = context.selectionsForDay ?? {};

  const selectionCounts: Record<string, number> = {};
  Object.values(selections).forEach((selection) => {
    if (!selection?.characterId) return;
    selectionCounts[selection.characterId] = (selectionCounts[selection.characterId] || 0) + 1;
  });

  const weightedOptions = available.map((characterId) => {
    let weight = 1;
    if (profile.prefersCharacters.includes(characterId)) {
      weight += 0.9;
    }
    if (profile.avoidsCharacters.includes(characterId)) {
      weight -= 0.5;
    }
    if (characterId === 'thief' || characterId === 'magician') {
      weight *= 0.7 + profile.aggression * 0.6;
    }
    const alreadySelected = selectionCounts[characterId] ?? 0;
    if (alreadySelected > 0) {
      const copycatBoost = 1 + alreadySelected * profile.copycatTendency;
      weight *= copycatBoost;
    } else if (profile.copycatTendency < 0.3) {
      weight *= 1.1;
    }
    return { id: characterId, weight: Math.max(0.1, weight) };
  });

  const selectedCharacterId = pickWeightedOption(weightedOptions);
  if (!selectedCharacterId) return null;

  if (selectedCharacterId === 'thief') {
    const targetOptions = available.filter((id) => id !== 'thief');
    const targetWeighted = targetOptions.length
      ? targetOptions.map((id) => ({
          id,
          weight: (selectionCounts[id] ?? 0) + (profile.aggression > 0.5 ? 1.5 : 1),
        }))
      : [{ id: 'merchant', weight: 1 }];
    const thiefTarget = pickWeightedOption(targetWeighted) ?? 'merchant';
    return { characterId: 'thief', thiefTargetCharacterId: thiefTarget };
  }

  return { characterId: selectedCharacterId };
}

export function pickAiJudgeTarget(context: JudgeContext): string | null {
  if (!context.players.length) return null;
  const sorted = [...context.players].sort((a, b) => {
    const lifeDiff = (a.lives ?? 0) - (b.lives ?? 0);
    if (lifeDiff !== 0) return lifeDiff;
    return (a.dailyCoins ?? 0) - (b.dailyCoins ?? 0);
  });
  const candidates = sorted.slice(0, Math.min(3, sorted.length));
  return candidates[Math.floor(Math.random() * candidates.length)]?.id ?? sorted[0].id;
}

export function pickAiMagicianAction(context: MagicianContext): { targetPlayerId: string; forcedCharacterId: string } | null {
  const profile = getAiProfile(context.profileId);
  const potentialTargets = context.players.filter((player) => player.id !== context.selfId);

  if (!potentialTargets.length) return null;

  const rankedTargets = [...potentialTargets].sort((a, b) => {
    const lifeDiff = (b.lives ?? 1) - (a.lives ?? 1);
    if (lifeDiff !== 0) return lifeDiff;
    return (b.dailyCoins ?? 0) - (a.dailyCoins ?? 0);
  });

  const shortlist = rankedTargets.slice(0, Math.min(3, rankedTargets.length));
  const targetPlayer = shortlist[Math.floor(Math.random() * shortlist.length)] ?? rankedTargets[0];

  const available = context.availableCharacterIds.length ? context.availableCharacterIds : ['peasant'];
  const weightedForcedOptions = available.map((characterId) => {
    let weight = 1;
    if (profile.avoidsCharacters.includes(characterId)) {
      weight += 1.2;
    }
    if (characterId === 'peasant' || characterId === 'saint') {
      weight += 0.4;
    }
    if (characterId === 'merchant') {
      weight -= 0.4;
    }
    return { id: characterId, weight: Math.max(0.1, weight) };
  });

  const forcedCharacterId = pickWeightedOption(weightedForcedOptions) ?? available[0];

  return {
    targetPlayerId: targetPlayer.id,
    forcedCharacterId,
  };
}

