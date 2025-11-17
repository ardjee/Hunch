'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import type { Game, Player, PlayerCharacterSelection } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import {
  generateAiHunch,
  pickAiVote,
  pickAiCharacterSelection,
  pickAiJudgeTarget,
  pickAiMagicianAction,
} from '@/lib/ai/logic';

interface UseAiPlayersControllerConfig {
  gameId?: string;
  gameData: Game | null;
  players: Player[];
  isCurrentUserGameMaster: boolean;
}

type SelectionMap = Record<string, PlayerCharacterSelection>;

export function useAiPlayersController({
  gameId,
  gameData,
  players,
  isCurrentUserGameMaster,
}: UseAiPlayersControllerConfig) {
  const aiPlayers = useMemo(() => players.filter((player) => player.isAi), [players]);
  const shouldControlAi =
    Boolean(db && gameId && gameData && gameData.status === 'in-progress') &&
    isCurrentUserGameMaster &&
    aiPlayers.length > 0;

  const hunchProcessingRef = useRef(new Set<string>());
  const voteProcessingRef = useRef(new Set<string>());
  const selectionProcessingRef = useRef(new Set<string>());
  const specialRoleProcessingRef = useRef(new Set<string>());

  const submitAiHunch = useCallback(
    async (player: Player) => {
      if (!db || !gameId || hunchProcessingRef.current.has(player.id)) return;
      hunchProcessingRef.current.add(player.id);

      try {
        const gameRef = doc(db, 'games', gameId);
        await runTransaction(db, async (transaction) => {
          const gameSnap = await transaction.get(gameRef);
          if (!gameSnap.exists()) return;
          const currentGame = gameSnap.data() as Game;
          if (
            currentGame.currentDayStep !== 1 ||
            !currentGame.currentChallengeDescription ||
            (currentGame.submittedHunches || {})[player.id]
          ) {
            return;
          }

          const hunch = generateAiHunch({
            profileId: player.aiProfileId,
            challengeDescription: currentGame.currentChallengeDescription,
            currentDay: currentGame.currentDay,
          });

          transaction.update(gameRef, {
            [`submittedHunches.${player.id}`]: hunch,
          });
        });
      } catch (error) {
        console.error('AI hunch generation failed', error);
      } finally {
        hunchProcessingRef.current.delete(player.id);
      }
    },
    [gameId]
  );

  const submitAiVote = useCallback(
    async (player: Player) => {
      if (!db || !gameId || voteProcessingRef.current.has(player.id)) return;
      voteProcessingRef.current.add(player.id);

      try {
        const gameRef = doc(db, 'games', gameId);
        await runTransaction(db, async (transaction) => {
          const gameSnap = await transaction.get(gameRef);
          if (!gameSnap.exists()) return;
          const currentGame = gameSnap.data() as Game;
          if (
            currentGame.currentDayStep !== 2 ||
            !currentGame.currentChallengeActualResult ||
            (currentGame.playerVotes || {})[player.id]
          ) {
            return;
          }

          const voteFor = pickAiVote({
            profileId: player.aiProfileId,
            actualResult: currentGame.currentChallengeActualResult,
            submittedHunches: currentGame.submittedHunches,
            players,
          });

          if (!voteFor) return;

          transaction.update(gameRef, {
            [`playerVotes.${player.id}`]: voteFor,
          });
        });
      } catch (error) {
        console.error('AI vote submission failed', error);
      } finally {
        voteProcessingRef.current.delete(player.id);
      }
    },
    [gameId, players]
  );

  const submitCharacterSelection = useCallback(
    async (player: Player) => {
      if (!db || !gameId || selectionProcessingRef.current.has(player.id)) return;
      selectionProcessingRef.current.add(player.id);

      try {
        const gameRef = doc(db, 'games', gameId);
        await runTransaction(db, async (transaction) => {
          const gameSnap = await transaction.get(gameRef);
          if (!gameSnap.exists()) return;
          const currentGame = gameSnap.data() as Game;
          if (currentGame.currentDayStep !== 3) return;

          const dayKey = String(currentGame.currentDay);
          const selectionsForDay: SelectionMap = currentGame.playerCharacterSelectionsByDay?.[dayKey] || {};

          if (selectionsForDay[player.id]) return;

          const nextDayKey = String(currentGame.currentDay + 1);
          const forcedCharacterId = currentGame.magicianForcedSelections?.[nextDayKey]?.find(
            (forced) => forced.targetPlayerId === player.id
          )?.forcedCharacterId;

          const selection = pickAiCharacterSelection({
            profileId: player.aiProfileId,
            availableCharacterIds: currentGame.availableCharacterIds || [],
            selectionsForDay,
            forcedCharacterId,
          });

          if (!selection) return;

          transaction.update(gameRef, {
            [`playerCharacterSelectionsByDay.${dayKey}.${player.id}`]: selection,
          });
        });
      } catch (error) {
        console.error('AI character selection failed', error);
      } finally {
        selectionProcessingRef.current.delete(player.id);
      }
    },
    [gameId]
  );

  const resolveJudgeAction = useCallback(
    async (judge: Player) => {
      if (!db || !gameId || specialRoleProcessingRef.current.has(judge.id)) return;
      specialRoleProcessingRef.current.add(judge.id);

      try {
        const targetPlayerId = pickAiJudgeTarget({ players });
        if (!targetPlayerId) return;

        const gameRef = doc(db, 'games', gameId);
        const targetPlayerRef = doc(db, 'games', gameId, 'players', targetPlayerId);

        await runTransaction(db, async (transaction) => {
          const gameSnap = await transaction.get(gameRef);
          if (!gameSnap.exists()) return;
          const currentGame = gameSnap.data() as Game;
          const awaiting = currentGame.playerAwaitingTargetSelection;

          if (!awaiting || awaiting.playerId !== judge.id || awaiting.role !== 'judge') {
            return;
          }

          const targetSnap = await transaction.get(targetPlayerRef);
          if (!targetSnap.exists()) return;

          const currentLives = targetSnap.data().lives ?? 0;
          transaction.update(targetPlayerRef, { lives: currentLives + 1 });
          transaction.update(gameRef, { playerAwaitingTargetSelection: null });
        });
      } catch (error) {
        console.error('AI judge action failed', error);
      } finally {
        specialRoleProcessingRef.current.delete(judge.id);
      }
    },
    [gameId, players]
  );

  const resolveMagicianAction = useCallback(
    async (magician: Player) => {
      if (!db || !gameId || specialRoleProcessingRef.current.has(magician.id)) return;
      specialRoleProcessingRef.current.add(magician.id);

      try {
        const action = pickAiMagicianAction({
          profileId: magician.aiProfileId,
          players,
          availableCharacterIds: gameData?.availableCharacterIds || [],
          selfId: magician.id,
        });

        if (!action) return;

        const gameRef = doc(db, 'games', gameId);
        await runTransaction(db, async (transaction) => {
          const gameSnap = await transaction.get(gameRef);
          if (!gameSnap.exists()) return;
          const currentGame = gameSnap.data() as Game;
          const awaiting = currentGame.playerAwaitingTargetSelection;

          if (!awaiting || awaiting.playerId !== magician.id || awaiting.role !== 'magician') {
            return;
          }

          const nextDayKey = String(currentGame.currentDay + 1);
          const existingSelections = currentGame.magicianForcedSelections || {};
          const selectionsForNextDay = existingSelections[nextDayKey] || [];

          transaction.update(gameRef, {
            magicianForcedSelections: {
              ...existingSelections,
              [nextDayKey]: [...selectionsForNextDay, action],
            },
            playerAwaitingTargetSelection: null,
          });
        });
      } catch (error) {
        console.error('AI magician action failed', error);
      } finally {
        specialRoleProcessingRef.current.delete(magician.id);
      }
    },
    [gameData?.availableCharacterIds, gameId, players]
  );

  useEffect(() => {
    if (!shouldControlAi || !gameData) return;
    if (gameData.currentDayStep !== 1 || !gameData.currentChallengeDescription) return;
    const submitted = gameData.submittedHunches || {};
    aiPlayers
      .filter((player) => !submitted[player.id])
      .forEach((player) => {
        submitAiHunch(player);
      });
  }, [aiPlayers, gameData, shouldControlAi, submitAiHunch]);

  useEffect(() => {
    if (!shouldControlAi || !gameData) return;
    if (gameData.currentDayStep !== 2 || !gameData.currentChallengeActualResult) return;
    const votes = gameData.playerVotes || {};
    aiPlayers
      .filter((player) => !votes[player.id])
      .forEach((player) => {
        submitAiVote(player);
      });
  }, [aiPlayers, gameData, shouldControlAi, submitAiVote]);

  useEffect(() => {
    if (!shouldControlAi || !gameData) return;
    if (gameData.currentDayStep !== 3) return;

    const dayKey = String(gameData.currentDay);
    const selectionsForDay: SelectionMap = gameData.playerCharacterSelectionsByDay?.[dayKey] || {};

    aiPlayers
      .filter((player) => !selectionsForDay[player.id])
      .forEach((player) => {
        submitCharacterSelection(player);
      });
  }, [aiPlayers, gameData, shouldControlAi, submitCharacterSelection]);

  useEffect(() => {
    if (!shouldControlAi || !gameData?.playerAwaitingTargetSelection) return;
    const awaiting = gameData.playerAwaitingTargetSelection;
    const actingAi = aiPlayers.find((player) => player.id === awaiting.playerId);
    if (!actingAi) return;

    if (awaiting.role === 'judge') {
      resolveJudgeAction(actingAi);
    } else if (awaiting.role === 'magician') {
      resolveMagicianAction(actingAi);
    }
  }, [aiPlayers, gameData?.playerAwaitingTargetSelection, resolveJudgeAction, resolveMagicianAction, shouldControlAi]);
}

