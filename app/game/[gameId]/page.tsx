
'use client';

import { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import PlayerStatusDisplay from '@/components/game/PlayerStatusDisplay';
import GameMasterControls from '@/components/game/GameMasterControls';
import PlayerSelectionStatusList from '@/components/game/PlayerSelectionStatusList';
import { Button } from '@/components/ui/button';
import { useGameData } from './useGameData';
import { useAiPlayersController } from '@/hooks/useAiPlayersController';
import { Loader2, Users, Castle, Settings, Menu, X } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import CurrentRoundActions from '@/components/game/CurrentRoundActions';
import CharacterSelection from '@/components/game/CharacterSelection';
import JudgeTargetSelection from '@/components/game/JudgeTargetSelection';
import MagicianTargetSelection from '@/components/game/MagicianTargetSelection';
import DayResultsDisplay from '@/components/game/DayResultsDisplay';
import VoteSummaryDisplay from '@/components/game/VoteSummaryDisplay';
import { CHARACTERS_LIST } from '@/lib/characters';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

function GamePageContent() {
  const router = useRouter();
  const {
    gameId,
    gameData,
    players,
    currentUserId,
    isLoading,
    error,
    isCurrentUserGameMaster,
    ...gameActions
  } = useGameData();

  const [lastRevealedCharacterId, setLastRevealedCharacterId] = useState<string | null | undefined>(null);
  const [isRevealDialogOpen, setIsRevealDialogOpen] = useState(false);
  const [castleHeight, setCastleHeight] = useState<string>('55%');
  const contentRef = useRef<HTMLDivElement>(null);

  useAiPlayersController({
    gameId,
    gameData,
    players,
    isCurrentUserGameMaster,
  });

  const admittedPlayersFiltered = useMemo(
    () => players.filter((p) => p.isAdmitted),
    [players]
  );

  const standingsKey = useMemo(() => {
    const playerDataSignature = admittedPlayersFiltered
      .map((p) => `${p.id}:${p.lives}:${p.dailyCoins}`)
      .sort()
      .join('|');
    const jackpotSignature = gameData?.jackpotAmount ?? 0;
    return `standings-${playerDataSignature}-${jackpotSignature}`;
  }, [admittedPlayersFiltered, gameData?.jackpotAmount]);

  useEffect(() => {
    if (gameData?.currentDayStep === 4 && gameData.activelyRevealedCharacterId) {
      if (gameData.activelyRevealedCharacterId !== lastRevealedCharacterId) {
        setLastRevealedCharacterId(gameData.activelyRevealedCharacterId);
        setIsRevealDialogOpen(true);
      }
    } else {
      setLastRevealedCharacterId(null);
      setIsRevealDialogOpen(false);
    }
  }, [gameData?.activelyRevealedCharacterId, gameData?.currentDayStep, lastRevealedCharacterId]);

  // Measure content height and adjust castle size
  useEffect(() => {
    if (!isRevealDialogOpen || !contentRef.current) return;
    
    const updateCastleSize = () => {
      const contentElement = contentRef.current;
      if (!contentElement) return;
      
      const viewportHeight = window.innerHeight;
      const contentHeight = contentElement.scrollHeight;
      const headerHeight = 120; // Approximate header height
      const buttonHeight = 80; // Approximate button area height
      const padding = 32; // Padding from dialog
      
      const usedHeight = contentHeight + headerHeight + buttonHeight + padding;
      const availableHeight = viewportHeight - usedHeight;
      
      // Calculate castle height: use more space if content is small, less if content is large
      // Minimum 30%, maximum 60% of viewport
      let newCastleHeight: number;
      if (availableHeight > viewportHeight * 0.5) {
        // Lots of space - make castle bigger (up to 60%)
        newCastleHeight = Math.min(60, Math.max(40, (availableHeight / viewportHeight) * 100));
      } else if (availableHeight < viewportHeight * 0.2) {
        // Little space - make castle smaller (minimum 30%)
        newCastleHeight = 30;
      } else {
        // Medium space - scale proportionally
        newCastleHeight = Math.max(30, Math.min(55, (availableHeight / viewportHeight) * 100));
      }
      
      setCastleHeight(`${newCastleHeight}%`);
    };
    
    // Initial calculation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateCastleSize, 100);
    
    // Recalculate on window resize
    window.addEventListener('resize', updateCastleSize);
    
    // Use ResizeObserver to watch for content changes
    const resizeObserver = new ResizeObserver(updateCastleSize);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateCastleSize);
      resizeObserver.disconnect();
    };
  }, [isRevealDialogOpen, gameData?.activelyRevealedCharacterId]);

  if (isLoading) {
    return (
      <PageLayout title="The Hunch" showLogo={false}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <span className="ml-4">Loading Game Data...</span>
        </div>
      </PageLayout>
    );
  }

  if (error || !gameData || !currentUserId) {
    return (
      <PageLayout title="The Hunch" showLogo={false}>
        <div className="text-center space-y-4 p-8 bg-card rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-destructive">
            {error || 'Error Loading Game'}
          </h2>
          <p className="text-lg text-muted-foreground">
            Essential game data could not be loaded. Please try returning to the
            homepage.
          </p>
          <Button onClick={() => router.push('/')} size="lg" variant="outline">
            Return to Homepage
          </Button>
        </div>
      </PageLayout>
    );
  }

  const dayKey = String(gameData.currentDay);
  const selectionsForCurrentDayByPlayer = gameData.playerCharacterSelectionsByDay?.[dayKey] || {};
  const selectedCharacterInfoThisDay = selectionsForCurrentDayByPlayer[currentUserId];
  const characterSelectionStatus = {
    totalAdmittedPlayers: admittedPlayersFiltered.length,
    playersWhoSelectedForCurrentDay: Object.keys(selectionsForCurrentDayByPlayer).filter(pid => admittedPlayersFiltered.some(ap => ap.id === pid)).length,
  };
  
  const mainContent = (() => {
    const {
        currentDay,
        currentDayStep,
        currentChallengeDescription,
        currentChallengeActualResult,
        submittedHunches,
        playerVotes,
        playerCharacterSelectionsByDay,
        playerAwaitingTargetSelection,
        currentDayResults,
        availableCharacterIds,
        magicianForcedSelections,
      } = gameData;
  
      const dayKey = String(currentDay);
      const selectionsForCurrentDay = playerCharacterSelectionsByDay?.[dayKey] || {};
      const selectedCharacterInfoThisDay = selectionsForCurrentDay[currentUserId];
      
      const admittedPlayers = players.filter(p => p.isAdmitted);
  
      const characterSelectionStatus = {
        totalAdmittedPlayers: admittedPlayers.length,
        playersWhoSelectedForCurrentDay: Object.keys(selectionsForCurrentDay).filter(pid => admittedPlayers.some(ap => ap.id === pid)).length,
      };
  
      const availableCharacters = availableCharacterIds 
          ? CHARACTERS_LIST.filter(c => availableCharacterIds.includes(c.id)) 
          : CHARACTERS_LIST;
      
      const forcedSelectionForCurrentUser = (() => {
        const nextDayKey = String(currentDay + 1);
        return magicianForcedSelections?.[nextDayKey]?.find(s => s.targetPlayerId === currentUserId);
      })();

      if (currentDayStep === 1 || currentDayStep === 2) {
        return (
          <CurrentRoundActions
            currentDay={currentDay}
            displayRoundNumber={currentDayStep}
            isGameMaster={isCurrentUserGameMaster}
            activeChallengeDescription={currentChallengeDescription ?? null}
            activeChallengeActualResult={currentChallengeActualResult ?? null}
            onSetChallenge={gameActions.handleSetChallenge}
            onPlayerSubmitHunch={gameActions.handlePlayerSubmitHunch}
            onRevealChallengeResult={gameActions.handleRevealChallengeResult}
            players={admittedPlayers}
            submittedHunchPlayerIds={new Set(Object.keys(submittedHunches || {}))}
            currentUserId={currentUserId}
            playerVotes={playerVotes || {}}
            onPlayerVote={gameActions.handlePlayerVote}
            currentDayStep={currentDayStep}
          />
        );
      }
    
      if (currentDayStep === 3) {
        return (
          <CharacterSelection
            characters={availableCharacters}
            onSelectCharacter={gameActions.handleSelectCharacter}
            selectedCharacterInfoThisDay={selectedCharacterInfoThisDay}
            isLoadingSelection={false}
            currentDay={currentDay}
            displayRoundNumber={currentDayStep}
            characterSelectionStatus={characterSelectionStatus}
            players={admittedPlayers}
            selectionsForCurrentDay={selectionsForCurrentDay}
            gameData={gameData}
            isCurrentUserGameMaster={isCurrentUserGameMaster}
            getNextCharacterToReveal={gameActions.getNextCharacterToReveal}
            forcedCharacterId={forcedSelectionForCurrentUser?.forcedCharacterId}
          />
        );
      }
    
      if (currentDayStep === 4) {
        if (playerAwaitingTargetSelection?.role === 'judge' && playerAwaitingTargetSelection.playerId === currentUserId) {
          return <JudgeTargetSelection players={admittedPlayers} onSelectPlayer={gameActions.handleJudgeAwardsLife} isLoading={false} currentJudgeScreenName={players.find(p=>p.id === currentUserId)?.screenName || "Judge"}/>;
        }
        if (playerAwaitingTargetSelection?.role === 'magician' && playerAwaitingTargetSelection.playerId === currentUserId) {
          return <MagicianTargetSelection players={admittedPlayers.filter(p => p.id !== currentUserId)} characters={availableCharacters} onSelectTarget={gameActions.handleMagicianSelection} isLoading={false} currentMagicianScreenName={players.find(p=>p.id === currentUserId)?.screenName || "Magician"}/>;
        }
        return (
            <CharacterSelection
                characters={availableCharacters}
                onSelectCharacter={gameActions.handleSelectCharacter}
                selectedCharacterInfoThisDay={selectedCharacterInfoThisDay}
                isLoadingSelection={false}
                currentDay={currentDay}
                displayRoundNumber={currentDayStep}
                characterSelectionStatus={characterSelectionStatus}
                players={admittedPlayers}
                selectionsForCurrentDay={selectionsForCurrentDay}
                gameData={gameData}
                isCurrentUserGameMaster={isCurrentUserGameMaster}
                getNextCharacterToReveal={gameActions.getNextCharacterToReveal}
            />
        );
      }
    
      if (currentDayStep === 5 && currentDayResults) {
        return <DayResultsDisplay results={currentDayResults} currentDay={currentDay} />;
      }

      if (currentDayStep === 6) {
        return (
          <VoteSummaryDisplay
            votes={gameData.playerVotes || {}}
            players={admittedPlayers}
            currentDay={currentDay}
            actualResult={gameData.currentDayResults?.actualResult}
            currentDayResults={gameData.currentDayResults}
          />
        );
      }

      // Debug logging for step 5
      if (currentDayStep === 5) {
        console.log('Step 5 Debug:', {
          currentDayStep,
          hasCurrentDayResults: !!currentDayResults,
          currentDayResults,
          hasChallengeActualResult: !!currentChallengeActualResult,
          currentChallengeActualResult,
          submittedHunchesCount: Object.keys(submittedHunches || {}).length,
        });
      }

      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3">Loading actions for Step {currentDayStep}...</span>
        </div>
      );
  })();


  return (
    <PageLayout title="The Hunch" showLogo={false}>
      <div className="w-full space-y-6">
        {mainContent}
      </div>

      {/* Collapsible Options Section */}
      <Accordion type="multiple" className="w-full mt-6 space-y-2" defaultValue={[]}>
        {/* Player Selection Status */}
        {gameData.currentDayStep === 3 && !selectedCharacterInfoThisDay && (
          <AccordionItem value="player-selections" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Player Selections</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <PlayerSelectionStatusList
                currentDay={gameData.currentDay}
                characterSelectionStatus={characterSelectionStatus}
                players={admittedPlayersFiltered}
                selectionsForCurrentDay={selectionsForCurrentDayByPlayer}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Player Standings */}
        <AccordionItem value="standings" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Player Standings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PlayerStatusDisplay 
              key={standingsKey}
              players={admittedPlayersFiltered} 
              gameMasterId={gameData.gameMasterId} 
              jackpotAmount={gameData.jackpotAmount || 0} 
            />
          </AccordionContent>
        </AccordionItem>

        {/* Game Master Controls */}
        {isCurrentUserGameMaster && (
          <AccordionItem value="gm-controls" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Game Master Controls</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <GameMasterControls
                gameData={gameData}
                players={admittedPlayersFiltered}
                characterSelectionStatus={characterSelectionStatus}
                isCurrentUserGameMaster={isCurrentUserGameMaster}
                handleProceedToCharacterSelectionPhase={gameActions.handleProceedToCharacterSelectionPhase}
                handleProcessCharacterEffect={gameActions.handleProcessCharacterEffect}
                handleRevealDayResults={gameActions.handleRevealDayResults}
                handleShowVoteSummary={gameActions.handleShowVoteSummary}
                handleEndOfDayResolution={gameActions.handleEndOfDayResolution}
                getNextCharacterToReveal={gameActions.getNextCharacterToReveal}
                isLoadingProceedToCharacters={false}
                isLoadingCharacterProcessing={false}
                isLoadingDayResults={false}
                isLoadingVoteSummary={false}
                isLoadingEndOfDay={false}
                isLoadingJudgeSelection={false}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Navigation */}
        <AccordionItem value="navigation" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              <span>Navigation</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex justify-center pt-2">
              <Button onClick={() => router.push('/')} variant="outline" size="lg" className="w-full max-w-md">
                <Castle className="mr-2 h-5 w-5" /> Back to Main Screen
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {gameData.currentDayStep === 4 && gameData.activelyRevealedCharacterId && (() => {
        const revealedCharacter = CHARACTERS_LIST.find(c => c.id === gameData.activelyRevealedCharacterId);
        const selectionsForThisDay = selectionsForCurrentDayByPlayer;
        const playersWhoChoseCharacter = revealedCharacter
          ? admittedPlayersFiltered.filter(p => selectionsForThisDay[p.id]?.characterId === revealedCharacter.id)
          : [];
        const playersWhoChosePeasant = admittedPlayersFiltered.filter(p => selectionsForThisDay[p.id]?.characterId === 'peasant');
        const peasantCount = playersWhoChosePeasant.length;
        const thievesTargetingThisCharacter = revealedCharacter 
          ? Object.values(selectionsForThisDay).filter(selection => 
              selection.characterId === 'thief' && selection.thiefTargetCharacterId === revealedCharacter.id
            )
          : [];
        const thiefCount = thievesTargetingThisCharacter.length;
        const wasStolenFromByThief = thiefCount > 0;
        
        // Get all thieves for this day
        const allThievesForDay = Object.values(selectionsForThisDay).filter(selection => selection.characterId === 'thief');
        const totalThiefCount = allThievesForDay.length;
        
        // Get target character for single thief if exists
        const singleThiefTarget = totalThiefCount === 1 && allThievesForDay[0]?.thiefTargetCharacterId
          ? CHARACTERS_LIST.find(c => c.id === allThievesForDay[0].thiefTargetCharacterId)
          : null;

        return (
          <Dialog
            open={isRevealDialogOpen}
            onOpenChange={(open) => {
              if (!open) setIsRevealDialogOpen(false);
            }}
          >
            <DialogContent
              className="!fixed inset-0 w-screen h-[100dvh] max-w-none max-h-none m-0 rounded-none p-4 sm:p-6 md:p-8 !translate-x-0 !translate-y-0 flex flex-col border-4 border-amber-800/60 [&>button]:text-amber-900 [&>button]:hover:text-amber-950 [&>button]:hover:bg-amber-200/50 relative"
              style={{
                background: 'linear-gradient(to bottom, #0f1629 0%, #1a2338 50%, #0d1525 100%)',
              }}
              onInteractOutside={(event) => event.preventDefault()}
            >
              {/* Starry night sky */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(2px 2px at 90% 40%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 33% 60%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 55% 80%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(2px 2px at 70% 20%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 15% 80%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(2px 2px at 40% 10%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 25% 50%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(2px 2px at 10% 20%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 75% 90%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(2px 2px at 30% 15%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 65% 25%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 45% 75%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(2px 2px at 95% 55%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 5% 45%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 50% 35%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 12% 55%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(2px 2px at 35% 65%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 68% 45%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 88% 25%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(2px 2px at 22% 75%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 48% 15%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 72% 85%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(2px 2px at 38% 40%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 92% 70%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 18% 5%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(2px 2px at 58% 95%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 78% 35%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 42% 55%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(2px 2px at 8% 65%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 62% 5%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 28% 85%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(2px 2px at 52% 25%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 82% 45%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 15% 35%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(2px 2px at 45% 75%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 75% 15%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(1px 1px at 35% 95%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(2px 2px at 65% 55%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 25% 25%, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1px 1px at 55% 65%, rgba(255,255,255,0.7), transparent),
                    radial-gradient(2px 2px at 85% 85%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 5% 75%, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 95% 5%, rgba(255,255,255,0.8), transparent)
                  `,
                  backgroundSize: '100% 100%',
                }}
              />
              {/* Castle background at bottom */}
              <div 
                className="absolute bottom-0 left-0 right-0 w-full h-auto pointer-events-none z-0"
                style={{
                  backgroundImage: "url('/castle2.png')",
                  backgroundSize: '125% auto',
                  backgroundPosition: 'bottom center',
                  backgroundRepeat: 'no-repeat',
                  minHeight: '47%',
                }}
              />
              <DialogHeader className="flex-shrink-0 relative z-10 bg-hunch-parchment p-4 sm:p-6 rounded-lg border-2 border-amber-800/60 shadow-lg">
                <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-headline text-amber-900 flex items-center justify-center gap-2 sm:gap-3 text-center drop-shadow-sm">
                  {revealedCharacter?.icon && <revealedCharacter.icon className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-900" />}
                  {revealedCharacter?.name || 'Character'} Revealed!
                </DialogTitle>
                <DialogDescription className="text-base sm:text-lg font-body text-amber-800 text-center">
                  Character effects have been applied.
                </DialogDescription>
              </DialogHeader>

              <div ref={contentRef} className="space-y-4 mt-4 flex-1 overflow-y-auto relative z-10">
                {/* Thief Target Box - Show when thief is revealed and there's exactly 1 thief */}
                {revealedCharacter?.id === 'thief' && totalThiefCount === 1 && singleThiefTarget && (
                  <div className="bg-hunch-parchment p-3 sm:p-4 rounded-lg border-2 border-primary/30">
                    <div className="flex flex-col items-center gap-3">
                      <h3 className="font-headline text-xl sm:text-2xl font-bold text-gray-900 text-center">
                        🎯 Thief Target
                      </h3>
                      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/50">
                        {singleThiefTarget.icon && (
                          <singleThiefTarget.icon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900" />
                        )}
                        <span className="font-headline text-lg sm:text-xl font-semibold text-gray-900">
                          {singleThiefTarget.name}
                        </span>
                      </div>
                      <p className="font-body text-sm sm:text-base text-gray-700 text-center">
                        The thief is targeting players who chose {singleThiefTarget.name}
                      </p>
                    </div>
                  </div>
                )}
                {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && (
                  <div className="bg-hunch-parchment p-3 sm:p-4 rounded-lg border-2 border-primary/30">
                    {playersWhoChoseCharacter.length > 0 ? (
                      <p className="font-body text-lg sm:text-xl md:text-2xl font-bold text-red-600 text-center">
                        -🔪 The thief struck successfully!
                      </p>
                    ) : (
                      <p className="font-body text-lg sm:text-xl md:text-2xl font-bold text-green-600 text-center">
                        -🔪 The thief missed!
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-hunch-parchment p-3 sm:p-4 rounded-lg border border-border [&_*]:!text-gray-900">
                  <h3 className="font-headline text-lg sm:text-xl font-semibold mb-2">
                    Players Who Chose This Character:
                  </h3>
                  {playersWhoChoseCharacter.length > 0 ? (
                    <ul className="list-none pl-0 space-y-2">
                      {playersWhoChoseCharacter.map((player) => (
                        <li key={player.id} className="font-body text-base sm:text-lg flex items-center gap-2 sm:gap-3">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-border/50">
                            <AvatarImage 
                              src={`https://placehold.co/40x40/f0e4c0/8c5a2b.png?text=${getInitials(player.screenName)}`} 
                              alt={player.screenName} 
                              data-ai-hint="avatar medieval" 
                            />
                            <AvatarFallback className="text-xs bg-amber-200 text-amber-800">
                              {getInitials(player.screenName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{player.screenName}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-body text-base sm:text-lg">No one chose this character.</p>
                  )}
                </div>

                {revealedCharacter && (
                  <div className="bg-hunch-parchment p-3 sm:p-4 rounded-lg border-2 border-primary/30">
                    <h3 className="font-headline text-lg sm:text-xl font-semibold mb-2 text-gray-900">Character Effects:</h3>
                    {playersWhoChoseCharacter.length === 0 ? (
                      <div className="flex justify-center items-center py-2">
                        <X className="h-24 w-24 sm:h-32 sm:w-32 text-red-600 stroke-[4]" />
                      </div>
                    ) : revealedCharacter.id === 'thief' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {totalThiefCount === 1 && singleThiefTarget ? (
                          <li className="text-gray-600">-Effects will be shown when target character is revealed</li>
                        ) : totalThiefCount > 1 ? (
                          <>
                            <li className="text-red-600">-all thiefs pay half their coins to the jackpot</li>
                            <li className="text-red-600">-Can't steal from any character</li>
                          </>
                        ) : null}
                      </ul>
                    ) : revealedCharacter.id === 'monarch' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-Gets to choose the activity for the next day</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <li className="text-red-600">-Both monarchs lose all their coins to the jackpot.</li>
                        )}
                        {playersWhoChoseCharacter.length === 1 && peasantCount === 1 && (
                          <li className="text-green-600">-Takes all coins from the peasant.</li>
                        )}
                        {playersWhoChoseCharacter.length === 1 && peasantCount > 1 && (
                          <>
                            <li className="text-green-600">-Collects a tax from all peasants.</li>
                            <li className="text-red-600">-paid for all coins stolen from the peasants.</li>
                          </>
                        )}
                        {peasantCount === 0 && (
                          <li className="text-gray-600">-No peasant effects</li>
                        )}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'merchant' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-Daily coins are doubled next day</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <li className="text-red-600">-No daily coins next day</li>
                        )}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'decoy' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-No chores have to be done in real life</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <li className="text-red-600">-They have to do all the chores in real life</li>
                        )}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'peasant' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length > 1 ? (
                          <>
                            <li className="text-green-600">-Protected from theft if 1 monarch is chosen</li>
                            <li className="text-red-600">-pays 2 coins to the monarch or jackpot</li>
                            <li className="text-red-600">-Not protected from theft if 0 or multiple monarchs have been chosen</li>
                          </>
                        ) : playersWhoChoseCharacter.length === 1 ? (
                          <>
                            <li className="text-red-600">-No protection granted</li>
                            <li className="text-red-600">-pay all coins to the monarch or jackpot</li>
                          </>
                        ) : null}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'saint' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-jackpot is doubled</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <>
                            <li className="text-red-600">-Jackpot coins are halved</li>
                            <li className="text-red-600">-all saints pay 10 coins</li>
                          </>
                        )}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'judge' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-gives a life to a player</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <li className="text-red-600">-all judges lose 1 life</li>
                        )}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'trickster' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-their score will be 10% closer to the actual result!</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <>
                            <li className="text-gray-600">-their scores still count if they were closest</li>
                            <li className="text-red-600">-none of the tricksters can earn a life by voting who was closest.</li>
                          </>
                        )}
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <li className="text-red-600">-The thief stole all their coins</li>
                        )}
                      </ul>
                    ) : (
                      <>
                        <p className="font-body text-base sm:text-lg leading-relaxed whitespace-pre-line text-gray-900">
                          {revealedCharacter.description}
                        </p>
                        {wasStolenFromByThief && thiefCount === 1 && totalThiefCount === 1 && playersWhoChoseCharacter.length > 0 && singleThiefTarget && (
                          <p className="font-body text-base sm:text-lg text-red-600 mt-2">-The thief stole all their coins</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4 sm:mt-6 flex-shrink-0 relative z-10">
                <Button 
                  onClick={() => setIsRevealDialogOpen(false)} 
                  size="lg" 
                  className="font-headline w-full sm:w-auto bg-hunch-parchment text-amber-900 hover:bg-hunch-parchment/90 border-2 border-amber-800/60 shadow-lg font-bold text-lg sm:text-xl"
                >
                  Continue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </PageLayout>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<PageLayout title="The Hunch" showLogo={false}><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4">Initializing Game Interface...</span></div></PageLayout>}>
      <GamePageContent />
    </Suspense>
  );
}


