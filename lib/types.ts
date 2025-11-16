
import type { Timestamp } from 'firebase/firestore';

export interface Player {
  id: string; // Firestore document ID for the player subcollection
  screenName: string;
  lives: number;
  dailyCoins: number;
  isAdmitted?: boolean; // Relevant for lobby state, stored in Firestore
  createdAt?: Timestamp; // Firestore timestamp
}

export interface GameRound {
  roundNumber: number;
  challengeDescription?: string;
}

export interface GameDay {
  dayNumber: number;
  rounds: GameRound[];
}

export interface PlayerCharacterSelection {
  characterId: string;
  thiefTargetCharacterId?: string; // Only present if characterId is 'thief'
}

export interface MagicianForcedSelection {
  targetPlayerId: string;
  forcedCharacterId: string;
}

export interface Game {
  id: string; // Firestore document ID for the game
  gameName?: string; // Name of the game, set by the creator
  gameMasterId: string; // Player ID of the game master
  status: 'lobby' | 'in-progress' | 'concluded';
  createdAt: Timestamp; // Firestore timestamp
  
  // Game Settings
  maxPlayers: number;
  availableCharacterIds: string[];
  totalGameDays: number;

  // Game State
  currentDay: number;
  currentDayStep: number; // Tracks the current step of the day (1-5)
  currentChallengeDescription?: string | null;
  submittedHunches?: { [playerId: string]: string }; // PlayerId: HunchText for the current challenge
  currentChallengeActualResult?: string | null; // The actual result of the challenge, set by GM
  playerVotes?: { [votingPlayerId: string]: string }; // PlayerId: VotedForPlayerId for the current challenge
  playerCharacterSelectionsByDay?: {
    [dayNumber: string]: { // Using string for dayNumber as Firestore keys are strings
      [playerId: string]: PlayerCharacterSelection;
    };
  };
  jackpotAmount?: number; // Amount of coins in the central jackpot
  activelyRevealedCharacterId?: string | null; // ID of the character currently being revealed/processed
  playerAwaitingTargetSelection?: {
      playerId: string;
      role: 'judge' | 'magician';
  } | null;
  magicianForcedSelections?: {
    [dayNumber: string]: MagicianForcedSelection[]
  } | null;
  currentDayResults?: {
    actualResult: string;
    playerHunches: Array<{
      playerId:string;
      screenName: string;
      originalHunch: string;
      displayedHunch: string; // Hunch after Trickster adjustment, or same as original
      difference: number | null; // null if not applicable/calculable, or Infinity for disqualified
      isDisqualified: boolean;
      isTricksterAdjusted: boolean;
    }>;
  } | null;
}
