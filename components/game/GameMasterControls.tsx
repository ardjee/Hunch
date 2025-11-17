
'use client';

import type { Player, Game } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronsRight, PlaySquare, TrendingUp, Sparkles, ChevronRightSquare, UserCheck } from 'lucide-react';
import { CHARACTERS_LIST, CHARACTER_REVEAL_ORDER } from '@/lib/characters';

interface GameMasterControlsProps {
  gameData: Game;
  players: Player[];
  characterSelectionStatus: {
    totalAdmittedPlayers: number;
    playersWhoSelectedForCurrentDay: number;
  };
  isCurrentUserGameMaster: boolean;
  handleProceedToCharacterSelectionPhase: () => Promise<void>;
  handleProcessCharacterEffect: () => Promise<void>;
  handleRevealDayResults: () => Promise<void>;
  handleShowVoteSummary: () => Promise<void>;
  handleEndOfDayResolution: () => Promise<void>;
  isLoadingProceedToCharacters: boolean;
  isLoadingCharacterProcessing: boolean;
  isLoadingDayResults: boolean;
  isLoadingVoteSummary: boolean;
  isLoadingEndOfDay: boolean;
  isLoadingJudgeSelection: boolean;
  getNextCharacterToReveal: (currentlyRevealedId: string | null | undefined) => string | null;
}

const GameMasterControls: React.FC<GameMasterControlsProps> = ({
  gameData,
  players,
  characterSelectionStatus,
  isCurrentUserGameMaster,
  handleProceedToCharacterSelectionPhase,
  handleProcessCharacterEffect,
  handleRevealDayResults,
  handleShowVoteSummary,
  handleEndOfDayResolution,
  isLoadingProceedToCharacters,
  isLoadingCharacterProcessing,
  isLoadingDayResults,
  isLoadingVoteSummary,
  isLoadingEndOfDay,
  isLoadingJudgeSelection,
  getNextCharacterToReveal,
}) => {
  if (!isCurrentUserGameMaster || gameData.status !== 'in-progress') {
    return null;
  }

  const allPlayersSelectedCharacterThisDay = players.length > 0 &&
    characterSelectionStatus.playersWhoSelectedForCurrentDay === characterSelectionStatus.totalAdmittedPlayers;

  const nextCharacterToReveal = getNextCharacterToReveal(gameData.activelyRevealedCharacterId);
  const allCharacterEffectsActuallyProcessed =
      gameData.currentDayStep === 4 &&
      !!gameData.activelyRevealedCharacterId &&
      !nextCharacterToReveal &&
      !gameData.playerAwaitingTargetSelection;

  // GM can proceed if basic conditions for step 2 are met (challenge set, result revealed)
  // The actual check for allVotesIn (and confirmation) is handled by handleProceedToCharacterSelectionPhase
  const canTriggerProceedToCharacterSelection_Step3 =
    gameData.currentDayStep === 2 &&
    !!gameData.currentChallengeDescription &&
    !!gameData.currentChallengeActualResult &&
    !isLoadingProceedToCharacters && !isLoadingCharacterProcessing && !isLoadingEndOfDay && !isLoadingJudgeSelection && !isLoadingDayResults;

  const canStartCharacterReveals_Step4 =
    gameData.currentDayStep === 3 &&
    allPlayersSelectedCharacterThisDay &&
    !isLoadingCharacterProcessing && !isLoadingEndOfDay && !isLoadingJudgeSelection && !isLoadingDayResults && !isLoadingProceedToCharacters;

  const canProcessNextCharacterEffect_DuringStep4 =
    gameData.currentDayStep === 4 &&
    !!nextCharacterToReveal &&
    !gameData.playerAwaitingTargetSelection &&
    !isLoadingCharacterProcessing && !isLoadingEndOfDay && !isLoadingJudgeSelection && !isLoadingDayResults && !isLoadingProceedToCharacters;

  const canRevealDayResults_Step5 =
    gameData.currentDayStep === 4 &&
    allCharacterEffectsActuallyProcessed &&
    !gameData.currentDayResults &&
    !isLoadingDayResults && !isLoadingCharacterProcessing && !isLoadingEndOfDay && !isLoadingJudgeSelection && !isLoadingProceedToCharacters;

  // Also allow revealing if we're at step 5 but results are missing (recovery mode)
  const canRevealDayResults_Step5_Recovery =
    gameData.currentDayStep === 5 &&
    !gameData.currentDayResults &&
    !isLoadingDayResults && !isLoadingCharacterProcessing && !isLoadingEndOfDay && !isLoadingJudgeSelection && !isLoadingProceedToCharacters;

  const canShowVoteSummary_Step6 =
    gameData.currentDayStep === 5 &&
    !!gameData.currentDayResults &&
    !isLoadingVoteSummary && !isLoadingDayResults && !isLoadingCharacterProcessing && !isLoadingEndOfDay && !isLoadingJudgeSelection && !isLoadingProceedToCharacters;

  const canAdvanceDay_AfterStep6 =
    gameData.currentDayStep === 6 &&
    !!gameData.currentDayResults &&
    !isLoadingEndOfDay && !isLoadingCharacterProcessing && !isLoadingJudgeSelection && !isLoadingDayResults && !isLoadingProceedToCharacters;

  const calculatedDisplayRoundNumber = gameData.currentDayStep;
  const totalStepsPerDay = 6;

  const dynamicRevealOrder = CHARACTER_REVEAL_ORDER.filter(id => gameData.availableCharacterIds.includes(id));
  const firstCharacterInRevealOrder = dynamicRevealOrder.length > 0 ? dynamicRevealOrder[0] : null;

  return (
    <div className="mt-8 p-4 border-t flex flex-col items-center space-y-3">
      <h3 className="text-lg font-semibold text-primary">Game Master Controls (Day {gameData.currentDay}, Step: {calculatedDisplayRoundNumber}/{totalStepsPerDay})</h3>

      {canTriggerProceedToCharacterSelection_Step3 && (
         <Button
            onClick={handleProceedToCharacterSelectionPhase}
            disabled={isLoadingProceedToCharacters || isLoadingCharacterProcessing || isLoadingEndOfDay || isLoadingJudgeSelection || isLoadingDayResults}
            className="w-full max-w-md hunch-glow"
            size="lg"
          >
            {isLoadingProceedToCharacters ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Finalize Voting & Proceed
          </Button>
      )}

      {canStartCharacterReveals_Step4 && firstCharacterInRevealOrder && (
         <Button
            onClick={handleProcessCharacterEffect}
            disabled={isLoadingCharacterProcessing || isLoadingEndOfDay || isLoadingJudgeSelection || isLoadingDayResults || isLoadingProceedToCharacters}
            className="w-full max-w-md hunch-glow"
            size="lg"
          >
            {isLoadingCharacterProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlaySquare className="mr-2 h-5 w-5" />}
             Start Character Reveals (Step 4 - Reveal {CHARACTERS_LIST.find(c => c.id === firstCharacterInRevealOrder)?.name || 'First'})
          </Button>
      )}

      {canProcessNextCharacterEffect_DuringStep4 && (
        <Button
          onClick={handleProcessCharacterEffect}
          disabled={isLoadingCharacterProcessing || isLoadingEndOfDay || isLoadingJudgeSelection || isLoadingDayResults || isLoadingProceedToCharacters}
          className="w-full max-w-md hunch-glow"
          size="lg"
          variant="secondary"
        >
          {isLoadingCharacterProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ChevronRightSquare className="mr-2 h-5 w-5" />}
          Reveal {CHARACTERS_LIST.find(c => c.id === nextCharacterToReveal!)?.name || 'Next Character'}
        </Button>
      )}

      {(canRevealDayResults_Step5 || canRevealDayResults_Step5_Recovery) && (
         <Button
            onClick={handleRevealDayResults}
            disabled={isLoadingDayResults || isLoadingCharacterProcessing || isLoadingEndOfDay || isLoadingJudgeSelection || isLoadingProceedToCharacters}
            className="w-full max-w-md hunch-glow"
            size="lg"
          >
            {isLoadingDayResults ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <TrendingUp className="mr-2 h-5 w-5" />}
            {isLoadingDayResults ? 'Calculating Results...' : `Reveal Day ${gameData.currentDay} Results (Step 5)`}
          </Button>
      )}

      {canShowVoteSummary_Step6 && (
         <Button
            onClick={handleShowVoteSummary}
            disabled={isLoadingVoteSummary || isLoadingDayResults || isLoadingCharacterProcessing || isLoadingEndOfDay || isLoadingJudgeSelection || isLoadingProceedToCharacters}
            className="w-full max-w-md hunch-glow"
            size="lg"
            variant="secondary"
         >
            {isLoadingVoteSummary ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserCheck className="mr-2 h-5 w-5" />}
            {isLoadingVoteSummary ? 'Preparing Vote Summary...' : `Show Vote Summary (Step 6)`}
         </Button>
      )}

      {canAdvanceDay_AfterStep6 && (
          <Button
              onClick={handleEndOfDayResolution}
              disabled={isLoadingEndOfDay || isLoadingCharacterProcessing || isLoadingJudgeSelection || isLoadingDayResults || isLoadingProceedToCharacters}
              className="w-full max-w-md hunch-glow"
              size="lg"
          >
              {isLoadingEndOfDay ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ChevronsRight className="mr-2 h-5 w-5" />}
              {isLoadingEndOfDay ? 'Processing Day End...' : (gameData.currentDay < gameData.totalGameDays ? `End Day ${gameData.currentDay} & Advance to Day ${gameData.currentDay + 1}` : 'Conclude Game')}
          </Button>
      )}

    </div>
  );
};

export default GameMasterControls;
