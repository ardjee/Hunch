
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  updateDoc,
  getDocs,
  setDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/client';
import {
  Game,
  Player,
  PlayerCharacterSelection,
  MagicianForcedSelection,
} from '@/lib/types';
import {
  CHARACTERS_LIST,
  CHARACTER_REVEAL_ORDER,
} from '@/lib/characters';
import { DEFAULT_DAILY_COINS } from '@/lib/constants';

export function useGameData() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const gameId = params.gameId as string;

  const [gameData, setGameData] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playerProcessingAttemptedRef = useRef(false);

  // Effect 1: Core data loading and player ID management
  useEffect(() => {
    const playerIdFromUrl = searchParams.get('playerId');
    if (playerIdFromUrl) {
      setCurrentUserId(playerIdFromUrl);
      localStorage.setItem('lastActiveGameId', gameId);
      localStorage.setItem('lastPlayerId', playerIdFromUrl);
    } else {
      const lastPlayerId = localStorage.getItem('lastPlayerId');
      if (lastPlayerId) {
        setCurrentUserId(lastPlayerId);
      }
    }

    if (!gameId || !db) {
      setError('Game ID is missing or database unavailable.');
      setIsLoading(false);
      return;
    }

    const gameDocRef = doc(db, 'games', gameId);
    const unsubscribeGame = onSnapshot(
      gameDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setGameData(docSnap.data() as Game);
          if (docSnap.data().status === 'lobby') {
            router.push(`/lobby/${gameId}?playerId=${currentUserId || ''}`);
          }
          if (docSnap.data().status === 'concluded') {
            toast({ title: 'Game Concluded' });
            router.push('/');
          }
        } else {
          setError('Game not found.');
          setGameData(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching game data:', err);
        setError('Failed to load game data.');
        setIsLoading(false);
      }
    );

    const playersQuery = query(
      collection(db, 'games', gameId, 'players'),
      where('isAdmitted', '==', true)
    );
    const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
      const admittedPlayers = snapshot.docs.map(
        (playerDoc) => ({ ...playerDoc.data(), id: playerDoc.id } as Player)
      );
      setPlayers(admittedPlayers);
    });

    return () => {
      unsubscribeGame();
      unsubscribePlayers();
    };
  }, [gameId, router, searchParams, toast, currentUserId]);

  // Effect 2: Handling new player joining
  useEffect(() => {
    const screenName = searchParams.get('screenName');
    const isHost = searchParams.get('isHost') === 'true';
    const playerId = searchParams.get('playerId');

    if (!gameId || !screenName || isHost || playerId || !gameData || playerProcessingAttemptedRef.current || !db) {
      return;
    }

    if (gameData.status !== 'lobby') {
      toast({ title: 'Game Not in Lobby', variant: 'destructive' });
      router.push('/');
      return;
    }

    playerProcessingAttemptedRef.current = true;

    const processJoiningPlayer = async () => {
      try {
        const playersQuery = query(
          collection(db, 'games', gameId, 'players'),
          where('screenName', '==', screenName)
        );
        const querySnapshot = await getDocs(playersQuery);

        if (querySnapshot.empty) {
          const newPlayerId = doc(collection(db, 'players_placeholder')).id;
          const newPlayerPayload: Omit<Player, 'id'> = {
            screenName,
            lives: 1,
            dailyCoins: 2,
            isAdmitted: false,
            createdAt: serverTimestamp(),
          };
          await setDoc(
            doc(db, 'games', gameId, 'players', newPlayerId),
            newPlayerPayload
          );
          setCurrentUserId(newPlayerId);
          localStorage.setItem('lastPlayerId', newPlayerId);
          toast({ title: 'Joined Lobby Queue' });
        } else {
          const existingPlayerId = querySnapshot.docs[0].id;
          setCurrentUserId(existingPlayerId);
          localStorage.setItem('lastPlayerId', existingPlayerId);
          toast({ title: 'Rejoining Lobby' });
        }
      } catch (e) {
        console.error('Error processing joining player:', e);
        toast({ title: 'Error Joining Lobby', variant: 'destructive' });
      }
    };
    processJoiningPlayer();
  }, [gameData, gameId, router, searchParams, toast]);

  const isCurrentUserGameMaster = useMemo(() => {
    return !!currentUserId && !!gameData && currentUserId === gameData.gameMasterId;
  }, [currentUserId, gameData]);

  const dynamicRevealOrder = useMemo(() => {
    if (!gameData?.availableCharacterIds) return [];
    return CHARACTER_REVEAL_ORDER.filter((id) =>
      gameData.availableCharacterIds.includes(id)
    );
  }, [gameData?.availableCharacterIds]);

  const getNextCharacterToReveal = useCallback(
    (currentlyRevealedId: string | null | undefined): string | null => {
      if (!dynamicRevealOrder.length) return null;
      if (!currentlyRevealedId) {
        return dynamicRevealOrder[0];
      }
      const currentIndex = dynamicRevealOrder.indexOf(currentlyRevealedId);
      if (currentIndex === -1 || currentIndex === dynamicRevealOrder.length - 1) {
        return null;
      }
      return dynamicRevealOrder[currentIndex + 1];
    },
    [dynamicRevealOrder]
  );

  const handleSetChallenge = useCallback(async (description: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'games', gameId), {
        currentChallengeDescription: description,
        submittedHunches: {},
        currentChallengeActualResult: null,
        playerVotes: {},
      });
      toast({
        title: "Challenge Set!",
      });
    }, [gameId, toast]);


  const handlePlayerSubmitHunch = useCallback(
    async (hunchText: string) => {
      if (!db) return;
      const gameDocRef = doc(db, 'games', gameId);
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameDocRef);
        if (!gameDoc.exists()) throw 'Game not found';
        const currentGameData = gameDoc.data() as Game;
        const updatedHunches = {
          ...(currentGameData.submittedHunches || {}),
          [currentUserId!]: hunchText,
        };
        transaction.update(gameDocRef, { submittedHunches: updatedHunches });
      });
    },
    [gameId, currentUserId]
  );

  const handleRevealChallengeResult = useCallback(
    async (actualResult: string) => {
      if (!db) return;
      await updateDoc(doc(db, 'games', gameId), {
        currentChallengeActualResult: actualResult,
        currentDayStep: 2,
      });
    },
    [gameId]
  );

  const handlePlayerVote = useCallback(
    async (votedForPlayerId: string) => {
      if (!db) return;
      const gameDocRef = doc(db, 'games', gameId);
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameDocRef);
        if (!gameDoc.exists()) throw 'Game not found';
        const currentGameData = gameDoc.data() as Game;
        const updatedVotes = {
          ...(currentGameData.playerVotes || {}),
          [currentUserId!]: votedForPlayerId,
        };
        transaction.update(gameDocRef, { playerVotes: updatedVotes });
      });
    },
    [gameId, currentUserId]
  );

  const executeActualProceedToCharacterSelection = useCallback(async () => {
    if (!db) return;
    await updateDoc(doc(db, 'games', gameId), { currentDayStep: 3 });
  }, [gameId]);

  const handleProceedToCharacterSelectionPhase = useCallback(async () => {
    const allVotesIn =
      players.length === 0 ||
      Object.keys(gameData?.playerVotes || {}).length === players.length;

    if (!allVotesIn) {
      if (window.confirm('Not all players have voted. Proceed anyway?')) {
        await executeActualProceedToCharacterSelection();
      }
    } else {
      await executeActualProceedToCharacterSelection();
    }
  }, [
    players,
    gameData,
    executeActualProceedToCharacterSelection,
  ]);

  const handleSelectCharacter = useCallback(async (selection: PlayerCharacterSelection) => {
    if (!db) return;
    const dayKey = String(gameData!.currentDay);
    const gameDocRef = doc(db, 'games', gameId);

    await runTransaction(db, async (transaction) => {
        const gameDocSnap = await transaction.get(gameDocRef);
        if (!gameDocSnap.exists()) throw new Error("Game does not exist!");
        const currentGameData = gameDocSnap.data() as Game;

        const selectionsForDay = currentGameData.playerCharacterSelectionsByDay?.[dayKey] || {};
        const updatedSelections = { ...selectionsForDay, [currentUserId!]: selection };

        transaction.update(gameDocRef, {
            [`playerCharacterSelectionsByDay.${dayKey}`]: updatedSelections
        });
    });
}, [gameId, currentUserId, gameData]);

  const handleProcessCharacterEffect = useCallback(async () => {
    if (!db) return;
    const characterToProcess = getNextCharacterToReveal(
      gameData?.activelyRevealedCharacterId
    );
    if (!characterToProcess) return;

    await runTransaction(db, async (transaction) => {
      const gameDocRef = doc(db, 'games', gameId);
      const gameDoc = await transaction.get(gameDocRef);
      if (!gameDoc.exists()) throw 'Game not found';
      
      const currentGameData = gameDoc.data() as Game;
      const dayKey = String(currentGameData.currentDay);
      const selectionsForDay = currentGameData.playerCharacterSelectionsByDay?.[dayKey] || {};
      
      // Get all players who chose this character
      const playersWhoChoseCharacter = Object.entries(selectionsForDay)
        .filter(([_, selection]) => selection.characterId === characterToProcess)
        .map(([playerId]) => playerId);
      
      const characterCount = playersWhoChoseCharacter.length;
      let jackpotDelta = 0;
      const playerUpdates: Record<string, { dailyCoins?: number; lives?: number }> = {};
      let magicianDiceRollsForDay: { [playerId: string]: { diceRoll: number; cost: number } } | null = null;
      
      // Process character-specific effects
      if (characterToProcess === 'thief') {
        if (characterCount > 1) {
          // Multiple thieves: each loses half their coins to jackpot
          for (const playerId of playersWhoChoseCharacter) {
            const playerRef = doc(db, 'games', gameId, 'players', playerId);
            const playerDoc = await transaction.get(playerRef);
            if (playerDoc.exists()) {
              const currentCoins = playerDoc.data().dailyCoins || 0;
              const coinsToLose = Math.floor(currentCoins / 2);
              if (coinsToLose > 0) {
                playerUpdates[playerId] = { dailyCoins: currentCoins - coinsToLose };
                jackpotDelta += coinsToLose;
              }
            }
          }
        } else if (characterCount === 1) {
          // Single thief: steals from players who chose target character
          const thiefSelection = selectionsForDay[playersWhoChoseCharacter[0]];
          const targetCharacterId = thiefSelection?.thiefTargetCharacterId;
          if (targetCharacterId) {
            const targetPlayers = Object.entries(selectionsForDay)
              .filter(([_, selection]) => selection.characterId === targetCharacterId)
              .map(([playerId]) => playerId);
            
            for (const targetPlayerId of targetPlayers) {
              const targetPlayerRef = doc(db, 'games', gameId, 'players', targetPlayerId);
              const targetPlayerDoc = await transaction.get(targetPlayerRef);
              if (targetPlayerDoc.exists()) {
                const targetCoins = targetPlayerDoc.data().dailyCoins || 0;
                if (targetCoins > 0) {
                  playerUpdates[targetPlayerId] = { dailyCoins: 0 };
                  const thiefId = playersWhoChoseCharacter[0];
                  if (!playerUpdates[thiefId]) playerUpdates[thiefId] = {};
                  playerUpdates[thiefId].dailyCoins = (playerUpdates[thiefId].dailyCoins || 0) + targetCoins;
                }
              }
            }
          }
        }
      } else if (characterToProcess === 'monarch') {
        if (characterCount > 1) {
          // Multiple monarchs: lose all coins to jackpot
          for (const playerId of playersWhoChoseCharacter) {
            const playerRef = doc(db, 'games', gameId, 'players', playerId);
            const playerDoc = await transaction.get(playerRef);
            if (playerDoc.exists()) {
              const currentCoins = playerDoc.data().dailyCoins || 0;
              if (currentCoins > 0) {
                playerUpdates[playerId] = { dailyCoins: 0 };
                jackpotDelta += currentCoins;
              }
            }
          }
        } else if (characterCount === 1) {
          // Single monarch: collects tax from peasants
          const peasants = Object.entries(selectionsForDay)
            .filter(([_, selection]) => selection.characterId === 'peasant')
            .map(([playerId]) => playerId);
          
          if (peasants.length === 1) {
            // Single peasant: monarch takes all coins
            const peasantId = peasants[0];
            const peasantRef = doc(db, 'games', gameId, 'players', peasantId);
            const peasantDoc = await transaction.get(peasantRef);
            if (peasantDoc.exists()) {
              const peasantCoins = peasantDoc.data().dailyCoins || 0;
              if (peasantCoins > 0) {
                playerUpdates[peasantId] = { dailyCoins: 0 };
                const monarchId = playersWhoChoseCharacter[0];
                if (!playerUpdates[monarchId]) playerUpdates[monarchId] = {};
                playerUpdates[monarchId].dailyCoins = (playerUpdates[monarchId].dailyCoins || 0) + peasantCoins;
              }
            }
          } else if (peasants.length > 1) {
            // Multiple peasants: each pays 2 coins tax to monarch
            const taxPerPeasant = 2;
            for (const peasantId of peasants) {
              const peasantRef = doc(db, 'games', gameId, 'players', peasantId);
              const peasantDoc = await transaction.get(peasantRef);
              if (peasantDoc.exists()) {
                const currentCoins = peasantDoc.data().dailyCoins || 0;
                const taxAmount = Math.min(taxPerPeasant, currentCoins);
                if (taxAmount > 0) {
                  if (!playerUpdates[peasantId]) playerUpdates[peasantId] = {};
                  playerUpdates[peasantId].dailyCoins = currentCoins - taxAmount;
                  const monarchId = playersWhoChoseCharacter[0];
                  if (!playerUpdates[monarchId]) playerUpdates[monarchId] = {};
                  playerUpdates[monarchId].dailyCoins = (playerUpdates[monarchId].dailyCoins || 0) + taxAmount;
                }
              }
            }
          }
        }
      } else if (characterToProcess === 'peasant') {
        const monarchs = Object.entries(selectionsForDay)
          .filter(([_, selection]) => selection.characterId === 'monarch')
          .map(([playerId]) => playerId);
        
        if (monarchs.length !== 1) {
          // No monarch or multiple monarchs: peasants pay 2 coins to jackpot
          const taxPerPeasant = 2;
          for (const peasantId of playersWhoChoseCharacter) {
            const peasantRef = doc(db, 'games', gameId, 'players', peasantId);
            const peasantDoc = await transaction.get(peasantRef);
            if (peasantDoc.exists()) {
              const currentCoins = peasantDoc.data().dailyCoins || 0;
              const taxAmount = Math.min(taxPerPeasant, currentCoins);
              if (taxAmount > 0) {
                if (!playerUpdates[peasantId]) playerUpdates[peasantId] = {};
                playerUpdates[peasantId].dailyCoins = currentCoins - taxAmount;
                jackpotDelta += taxAmount;
              }
            }
          }
        }
        // If single monarch exists, tax is handled in monarch processing
      } else if (characterToProcess === 'saint') {
        if (characterCount === 1) {
          // Single saint: doubles jackpot
          const currentJackpot = currentGameData.jackpotAmount || 0;
          jackpotDelta = currentJackpot; // Double = add current amount
        } else if (characterCount > 1) {
          // Multiple saints: halve jackpot and each pays up to 10 coins
          const currentJackpot = currentGameData.jackpotAmount || 0;
          jackpotDelta = -Math.floor(currentJackpot / 2); // Halve = subtract half
          
          for (const playerId of playersWhoChoseCharacter) {
            const playerRef = doc(db, 'games', gameId, 'players', playerId);
            const playerDoc = await transaction.get(playerRef);
            if (playerDoc.exists()) {
              const currentCoins = playerDoc.data().dailyCoins || 0;
              const contribution = Math.min(10, currentCoins);
              if (contribution > 0) {
                if (!playerUpdates[playerId]) playerUpdates[playerId] = {};
                playerUpdates[playerId].dailyCoins = currentCoins - contribution;
                jackpotDelta += contribution;
              }
            }
          }
        }
      } else if (characterToProcess === 'judge') {
        if (characterCount > 1) {
          // Multiple judges: each loses a life
          for (const playerId of playersWhoChoseCharacter) {
            const playerRef = doc(db, 'games', gameId, 'players', playerId);
            const playerDoc = await transaction.get(playerRef);
            if (playerDoc.exists()) {
              const currentLives = playerDoc.data().lives || 0;
              if (currentLives > 0) {
                if (!playerUpdates[playerId]) playerUpdates[playerId] = {};
                playerUpdates[playerId].lives = Math.max(0, currentLives - 1);
              }
            }
          }
        } else if (characterCount === 1) {
          // Single judge: set playerAwaitingTargetSelection so they can award a life
          // This will be handled in gameUpdates below
        }
        // Single judge life award is handled separately in handleJudgeAwardsLife
      } else if (characterToProcess === 'magician') {
        // Magician pays dice roll cost to jackpot
        // Each magician rolls a 6-sided die, pays half (rounded up) to jackpot
        magicianDiceRollsForDay = {};
        for (const playerId of playersWhoChoseCharacter) {
          // Roll a 6-sided die (1-6)
          const diceRoll = Math.floor(Math.random() * 6) + 1;
          // Cost is half the dice roll, rounded up
          const cost = Math.ceil(diceRoll / 2);
          magicianDiceRollsForDay[playerId] = { diceRoll, cost };
          
          const playerRef = doc(db, 'games', gameId, 'players', playerId);
          const playerDoc = await transaction.get(playerRef);
          if (playerDoc.exists()) {
            const currentCoins = playerDoc.data().dailyCoins || 0;
            const actualCost = Math.min(cost, currentCoins);
            if (actualCost > 0) {
              if (!playerUpdates[playerId]) playerUpdates[playerId] = {};
              playerUpdates[playerId].dailyCoins = currentCoins - actualCost;
              jackpotDelta += actualCost;
            }
          }
        }
      } else if (characterToProcess === 'prince') {
        if (characterCount > 1) {
          // Multiple princes: each loses 2 lives
          for (const playerId of playersWhoChoseCharacter) {
            const playerRef = doc(db, 'games', gameId, 'players', playerId);
            const playerDoc = await transaction.get(playerRef);
            if (playerDoc.exists()) {
              const currentLives = playerDoc.data().lives || 0;
              if (currentLives > 0) {
                if (!playerUpdates[playerId]) playerUpdates[playerId] = {};
                playerUpdates[playerId].lives = Math.max(0, currentLives - 2);
              }
            }
          }
        }
      }
      
      // Apply player updates
      for (const [playerId, updates] of Object.entries(playerUpdates)) {
        const playerRef = doc(db, 'games', gameId, 'players', playerId);
        if (updates.dailyCoins !== undefined) {
          transaction.update(playerRef, { dailyCoins: updates.dailyCoins });
        }
        if (updates.lives !== undefined) {
          transaction.update(playerRef, { lives: updates.lives });
        }
      }
      
      // Update jackpot and log
      if (jackpotDelta !== 0) {
        const currentJackpot = currentGameData.jackpotAmount || 0;
        const newJackpot = Math.max(0, currentJackpot + jackpotDelta);
        transaction.update(gameDocRef, { jackpotAmount: newJackpot });
      }

      // Build jackpot log entry
      let jackpotLogEntry: { description: string; amount: number; icon?: string } | null = null;
      if (jackpotDelta !== 0) {
        if (characterToProcess === 'thief' && characterCount > 1) {
          jackpotLogEntry = { description: `${characterCount} Thieves lost half their coins to the jackpot`, amount: jackpotDelta, icon: 'thief' };
        } else if (characterToProcess === 'monarch' && characterCount > 1) {
          jackpotLogEntry = { description: `${characterCount} Monarchs lost all coins to the jackpot`, amount: jackpotDelta, icon: 'monarch' };
        } else if (characterToProcess === 'peasant') {
          jackpotLogEntry = { description: `Peasants paid tax to the jackpot (no single Monarch)`, amount: jackpotDelta, icon: 'peasant' };
        } else if (characterToProcess === 'saint' && characterCount === 1) {
          jackpotLogEntry = { description: `The Saint doubled the jackpot`, amount: jackpotDelta, icon: 'saint' };
        } else if (characterToProcess === 'saint' && characterCount > 1) {
          jackpotLogEntry = { description: `${characterCount} Saints: jackpot halved, each contributed coins`, amount: jackpotDelta, icon: 'saint' };
        } else if (characterToProcess === 'magician') {
          jackpotLogEntry = { description: `Magician${characterCount > 1 ? 's' : ''} paid dice cost to the jackpot`, amount: jackpotDelta, icon: 'magician' };
        }
      }

      let gameUpdates: Partial<Game> = {
        activelyRevealedCharacterId: characterToProcess,
      };

      // Append jackpot log entry if any
      if (jackpotLogEntry) {
        const existingLog = currentGameData.jackpotLog || [];
        gameUpdates.jackpotLog = [...existingLog, jackpotLogEntry];
      }
      if (currentGameData.currentDayStep === 3) {
        gameUpdates.currentDayStep = 4;
      }
      
      // Set playerAwaitingTargetSelection for single judge
      if (characterToProcess === 'judge' && characterCount === 1) {
        gameUpdates.playerAwaitingTargetSelection = {
          playerId: playersWhoChoseCharacter[0],
          role: 'judge',
        };
      }
      // Set playerAwaitingTargetSelection for magician (if needed)
      else if (characterToProcess === 'magician' && characterCount === 1) {
        gameUpdates.playerAwaitingTargetSelection = {
          playerId: playersWhoChoseCharacter[0],
          role: 'magician',
        };
      }
      
      // Store magician dice rolls if any were rolled
      if (magicianDiceRollsForDay) {
        const existingDiceRolls = currentGameData.magicianDiceRolls || {};
        gameUpdates.magicianDiceRolls = {
          ...existingDiceRolls,
          [dayKey]: magicianDiceRollsForDay
        };
      }

      transaction.update(gameDocRef, gameUpdates);
    });
    toast({ title: `Processed ${characterToProcess}` });
  }, [
    gameId,
    gameData,
    getNextCharacterToReveal,
    toast,
  ]);
  
  const handleJudgeAwardsLife = useCallback(async (targetPlayerId: string) => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
        const targetPlayerRef = doc(db, 'games', gameId, 'players', targetPlayerId);
        const gameRef = doc(db, 'games', gameId);

        const targetPlayerDoc = await transaction.get(targetPlayerRef);
        if (!targetPlayerDoc.exists()) throw new Error("Target player not found");

        // Apply judge life award immediately
        const newLives = (targetPlayerDoc.data().lives || 0) + 1;
        transaction.update(targetPlayerRef, { lives: newLives });
        transaction.update(gameRef, { playerAwaitingTargetSelection: null });
    });
    toast({title: "Life Awarded!"});
  }, [gameId, toast, db]);

  const handleMagicianSelection = useCallback(async (targetPlayerId: string, forcedCharacterId: string) => {
      if (!db) return;
      await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, "games", gameId);
        const gameDoc = await transaction.get(gameRef);
        if(!gameDoc.exists()) throw new Error("Game not found");
        
        const currentGData = gameDoc.data() as Game;
        const nextDay = String(currentGData.currentDay + 1);

        const newSelection: MagicianForcedSelection = { targetPlayerId, forcedCharacterId };
        const existingSelections = currentGData.magicianForcedSelections?.[nextDay] || [];
        
        const updatedSelections = {
            ...(currentGData.magicianForcedSelections || {}),
            [nextDay]: [...existingSelections, newSelection]
        };

        transaction.update(gameRef, {
            playerAwaitingTargetSelection: null,
            magicianForcedSelections: updatedSelections
        });
      });
      toast({title: "Player Enchanted"});
  }, [gameId, toast]);

  const handleRevealDayResults = useCallback(async () => {
    if (!db) return;
    if (!gameData || !gameData.currentChallengeActualResult) {
      toast({ title: 'Cannot reveal results - no actual result set', variant: 'destructive' });
      return;
    }

    const actualResult = parseFloat(gameData.currentChallengeActualResult);
    if (isNaN(actualResult)) {
      toast({ title: 'Actual result must be a number', variant: 'destructive' });
      return;
    }

    const dayKey = String(gameData.currentDay);
    const selectionsForCurrentDay = gameData.playerCharacterSelectionsByDay?.[dayKey] || {};

    // Find players who selected Trickster
    const tricksterPlayerIds = Object.entries(selectionsForCurrentDay)
      .filter(([_, selection]) => selection.characterId === 'trickster')
      .map(([playerId]) => playerId);

    const isSingleTrickster = tricksterPlayerIds.length === 1;
    const singleTricksterId = isSingleTrickster ? tricksterPlayerIds[0] : null;

    // Process each player's hunch
    const playerHunches = Object.entries(gameData.submittedHunches || {}).map(([playerId, hunchText]) => {
      const player = players.find(p => p.id === playerId);
      const screenName = player?.screenName || 'Unknown';
      const originalHunch = hunchText;

      // Parse the hunch as a number
      const hunchValue = parseFloat(hunchText);

      // Check if hunch is valid
      if (isNaN(hunchValue)) {
        return {
          playerId,
          screenName,
          originalHunch,
          displayedHunch: 'DISQUALIFIED',
          difference: Infinity,
          isDisqualified: true,
          isTricksterAdjusted: false,
        };
      }

      // Apply Trickster adjustment if applicable
      let displayedHunch = hunchText;
      let isTricksterAdjusted = false;
      let adjustedValue = hunchValue;

      if (playerId === singleTricksterId) {
        // Adjust by 10% closer to actual result (only for single trickster)
        const difference = actualResult - hunchValue;
        const adjustment = difference * 0.1;
        adjustedValue = hunchValue + adjustment;
        displayedHunch = `${originalHunch} (Adjusted: ${adjustedValue.toFixed(2)})`;
        isTricksterAdjusted = true;
      }
      // Note: Multiple tricksters don't get the 10% bonus, but their scores still count

      // Calculate difference from actual result
      const difference = Math.abs(actualResult - adjustedValue);

      return {
        playerId,
        screenName,
        originalHunch,
        displayedHunch,
        difference,
        isDisqualified: false,
        isTricksterAdjusted,
      };
    });

    // Sort by difference (best first)
    playerHunches.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      if (a.difference === null || b.difference === null) return 0;
      return a.difference - b.difference;
    });

    const currentDayResults = {
      actualResult: gameData.currentChallengeActualResult,
      playerHunches,
    };

    // Award coins and lives based on results
    await runTransaction(db, async (transaction) => {
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) throw 'Game not found';
      const currentGameData = gameDoc.data() as Game;
      
      let jackpotDelta = 0;
      const playerUpdates: Record<string, { dailyCoins?: number; lives?: number }> = {};
      
      // Award 5 coins to jackpot if any hunch is within 10% of actual result (flat, not cumulative)
      const tenPercentThreshold = actualResult * 0.1;
      let hasAccurateHunch = false;
      for (const hunchResult of playerHunches) {
        if (!hunchResult.isDisqualified && hunchResult.difference !== null && hunchResult.difference !== Infinity) {
          if (hunchResult.difference <= tenPercentThreshold) {
            hasAccurateHunch = true;
            break;
          }
        }
      }
      if (hasAccurateHunch) {
        jackpotDelta += 5;
      }
      
      // Store voting-based life awards to be applied in phase 6
      const bestHunch = playerHunches.find(h => !h.isDisqualified && h.difference !== null && h.difference !== Infinity);
      let votersForBest: string[] = [];
      if (bestHunch) {
        const bestPlayerId = bestHunch.playerId;
        const playerVotes = currentGameData.playerVotes || {};
        
        // Find all players who voted for the best hunch player
        // Exclude votes from tricksters if there are multiple tricksters
        const hasMultipleTricksters = tricksterPlayerIds.length > 1;
        votersForBest = Object.entries(playerVotes)
          .filter(([voterId, votedForId]) => {
            // Exclude trickster votes if there are multiple tricksters
            if (hasMultipleTricksters && tricksterPlayerIds.includes(voterId)) {
              return false;
            }
            return votedForId === bestPlayerId;
          })
          .map(([voterId]) => voterId)
          // Also exclude tricksters from receiving life awards if there are multiple tricksters
          .filter(voterId => !hasMultipleTricksters || !tricksterPlayerIds.includes(voterId));
      }
      
      // Apply player updates (only coins, not lives from voting)
      for (const [playerId, updates] of Object.entries(playerUpdates)) {
        const playerRef = doc(db, 'games', gameId, 'players', playerId);
        if (updates.dailyCoins !== undefined) {
          transaction.update(playerRef, { dailyCoins: updates.dailyCoins });
        }
      }
      
      // Update jackpot
      if (jackpotDelta !== 0) {
        const currentJackpot = currentGameData.jackpotAmount || 0;
        const newJackpot = currentJackpot + jackpotDelta;
        transaction.update(gameRef, { jackpotAmount: newJackpot });
      }
      
      // Store voting-based life awards to be applied in phase 6
      const currentDayKey = String(currentGameData.currentDay);
      const updatedVotingAwards = {
        ...(currentGameData.votingLifeAwards || {}),
        [currentDayKey]: votersForBest
      };
      
      // Add jackpot log entry for accurate hunch bonus
      let updatedJackpotLog = currentGameData.jackpotLog || [];
      if (hasAccurateHunch) {
        updatedJackpotLog = [...updatedJackpotLog, {
          description: `A hunch was within 10% of the result`,
          amount: 5,
          icon: 'hunch',
        }];
      }

      // Update game with results
      transaction.update(gameRef, {
        currentDayStep: 5,
        currentDayResults,
        votingLifeAwards: updatedVotingAwards,
        ...(updatedJackpotLog.length > 0 ? { jackpotLog: updatedJackpotLog } : {}),
      });
    });

    toast({ title: 'Day Results Revealed' });
  }, [gameId, gameData, players, toast, db]);

  const handleShowVoteSummary = useCallback(async () => {
    if (!db) return;
    if (!gameData?.currentDayResults) {
      toast({
        title: 'Reveal Results First',
        description: 'Show the hunch results before sharing the vote summary.',
        variant: 'destructive',
      });
      return;
    }

    await updateDoc(doc(db, 'games', gameId), {
      currentDayStep: 6,
    });
  }, [gameId, gameData?.currentDayResults, toast]);

  const handleShowJackpotSummary = useCallback(async () => {
    if (!db) return;
    await updateDoc(doc(db, 'games', gameId), {
      currentDayStep: 7,
    });
  }, [gameId, db]);

  const handleEndOfDayResolution = useCallback(async () => {
    if (!db) return;
    await runTransaction(db, async (transaction) => {
      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) throw 'Game not found';
      const currentGData = gameDoc.data() as Game;

      const isAdvancingDay = currentGData.currentDay < currentGData.totalGameDays;
      const currentDayKey = String(currentGData.currentDay);
      
      // Collect all player IDs that need to be read/updated
      const playerIdsToProcess = new Set<string>();
      
      // Add players who get voting life awards
      const votingLifeAwardPlayerIds = currentGData.votingLifeAwards?.[currentDayKey] || [];
      votingLifeAwardPlayerIds.forEach(playerId => playerIdsToProcess.add(playerId));
      
      if (isAdvancingDay) {
        // Get all player IDs from the game data's playerCharacterSelectionsByDay
        // This ensures we process players who have participated
        Object.values(currentGData.playerCharacterSelectionsByDay || {}).forEach(daySelections => {
          Object.keys(daySelections).forEach(playerId => playerIdsToProcess.add(playerId));
        });
        
        // Also check votingLifeAwards for any additional players
        Object.values(currentGData.votingLifeAwards || {}).forEach(playerIds => {
          playerIds.forEach(playerId => playerIdsToProcess.add(playerId));
        });
      }
      
      // PHASE 1: Read all player documents first (all reads before writes)
      const playerDocs = new Map<string, any>();
      for (const playerId of playerIdsToProcess) {
        const playerRef = doc(db, 'games', gameId, 'players', playerId);
        const playerDoc = await transaction.get(playerRef);
        if (playerDoc.exists()) {
          playerDocs.set(playerId, playerDoc.data());
        }
      }
      
      // PHASE 2: Now perform all writes
      // Apply voting-based life awards for the current day (phase 6)
      for (const playerId of votingLifeAwardPlayerIds) {
        const playerData = playerDocs.get(playerId);
        if (playerData) {
          const playerRef = doc(db, 'games', gameId, 'players', playerId);
          const currentLives = playerData.lives || 0;
          transaction.update(playerRef, { lives: currentLives + 1 });
        }
      }
      
      if (isAdvancingDay) {
        // Award daily coins to all players at the start of the new day
        // Check previous day's character selections to see who was merchant
        const previousDayKey = String(currentGData.currentDay);
        const previousDaySelections = currentGData.playerCharacterSelectionsByDay?.[previousDayKey] || {};
        
        // Update each player with daily coins
        for (const playerId of playerIdsToProcess) {
          const playerData = playerDocs.get(playerId);
          if (playerData && playerData.isAdmitted) {
            const playerRef = doc(db, 'games', gameId, 'players', playerId);
            const wasMerchant = previousDaySelections[playerId]?.characterId === 'merchant';
            
            // Award daily coins (double if they were merchant)
            const coinsToAward = wasMerchant ? DEFAULT_DAILY_COINS * 2 : DEFAULT_DAILY_COINS;
            const currentCoins = playerData.dailyCoins || 0;
            transaction.update(playerRef, { dailyCoins: currentCoins + coinsToAward });
          }
        }
      }

      const updates: Partial<Game> = isAdvancingDay
        ? {
            currentDay: currentGData.currentDay + 1,
            currentDayStep: 1,
            // Reset daily fields
            activelyRevealedCharacterId: null,
            currentChallengeDescription: null,
            currentChallengeActualResult: null,
            submittedHunches: {},
            playerVotes: {},
            playerAwaitingTargetSelection: null,
            currentDayResults: null,
            jackpotLog: null,
          }
        : { status: 'concluded' };

      transaction.update(gameRef, updates);
    });
    toast({ title: 'Day Ended' });
  }, [gameId, toast, db]);

  return {
    gameId,
    gameData,
    players,
    currentUserId,
    isLoading,
    error,
    isCurrentUserGameMaster,
    handleSetChallenge,
    handlePlayerSubmitHunch,
    handleRevealChallengeResult,
    handlePlayerVote,
    handleProceedToCharacterSelectionPhase,
    handleSelectCharacter,
    handleProcessCharacterEffect,
    handleJudgeAwardsLife,
    handleMagicianSelection,
    handleRevealDayResults,
    handleShowVoteSummary,
    handleShowJackpotSummary,
    handleEndOfDayResolution,
    getNextCharacterToReveal,
  };
}


