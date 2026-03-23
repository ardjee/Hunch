
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
import JackpotSummaryDisplay from '@/components/game/JackpotSummaryDisplay';
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
  const [isStandingsDialogOpen, setIsStandingsDialogOpen] = useState(false);
  const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(false);
  const [castleHeight, setCastleHeight] = useState<string>('55%');
  const [isProcessingNextCharacter, setIsProcessingNextCharacter] = useState(false);
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
      if (gameData.playerAwaitingTargetSelection) {
        setIsRevealDialogOpen(false);
      } else if (gameData.activelyRevealedCharacterId !== lastRevealedCharacterId) {
        setLastRevealedCharacterId(gameData.activelyRevealedCharacterId);
        setIsRevealDialogOpen(true);
      }
    } else {
      setLastRevealedCharacterId(null);
      setIsRevealDialogOpen(false);
    }
  }, [gameData?.activelyRevealedCharacterId, gameData?.currentDayStep, gameData?.playerAwaitingTargetSelection ?? null, lastRevealedCharacterId]);

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
            onProceedToNextStep={currentDayStep === 2 ? gameActions.handleProceedToCharacterSelectionPhase : undefined}
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
            onProceedToNextStep={isCurrentUserGameMaster ? gameActions.handleProcessCharacterEffect : undefined}
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
        return <DayResultsDisplay results={currentDayResults} currentDay={currentDay} isCurrentUserGameMaster={isCurrentUserGameMaster} onProceedToNextStep={isCurrentUserGameMaster ? gameActions.handleShowVoteSummary : undefined} />;
      }

      if (currentDayStep === 6) {
        return (
          <VoteSummaryDisplay
            votes={gameData.playerVotes || {}}
            players={admittedPlayers}
            currentDay={currentDay}
            actualResult={gameData.currentDayResults?.actualResult}
            currentDayResults={gameData.currentDayResults}
            isCurrentUserGameMaster={isCurrentUserGameMaster}
            onProceedToNextStep={isCurrentUserGameMaster ? gameActions.handleShowJackpotSummary : undefined}
          />
        );
      }

      if (currentDayStep === 7) {
        return (
          <JackpotSummaryDisplay
            currentDay={currentDay}
            jackpotAmount={gameData.jackpotAmount || 0}
            jackpotLog={gameData.jackpotLog || []}
            isCurrentUserGameMaster={isCurrentUserGameMaster}
            onProceedToNextStep={isCurrentUserGameMaster ? gameActions.handleEndOfDayResolution : undefined}
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
    <PageLayout showLogo={false}>
      <div className="w-full space-y-3 overflow-x-hidden relative">
        {gameData.currentDayStep && (
          <div className="absolute -top-1 left-1 z-20 bg-foreground/80 text-background text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm opacity-60">
            D{gameData.currentDay}S{gameData.currentDayStep}
          </div>
        )}
        {mainContent}
      </div>

      {/* Floating Quick Panel */}
      {isUtilityPanelOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsUtilityPanelOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => setIsUtilityPanelOpen((prev) => !prev)}
          aria-label="Toggle quick panel"
          aria-expanded={isUtilityPanelOpen}
          className="w-14 h-14 rounded-full border-2 border-amber-900 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
          }}
        >
          {isUtilityPanelOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div
          className={`w-80 max-w-[90vw] rounded-2xl border-2 border-amber-800 shadow-[0_10px_30px_rgba(80,50,20,0.4)] transition-all duration-200 ${
            isUtilityPanelOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
          }`}
          style={{ 
            backgroundColor: 'hsl(40, 60%, 95%)',
            opacity: isUtilityPanelOpen ? 1 : 0,
          }}
        >
          <Accordion 
            type="multiple" 
            className="w-full p-4 space-y-2" 
            defaultValue={[]}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            }}
          >
            {gameData.currentDayStep === 3 && !selectedCharacterInfoThisDay && (
              <AccordionItem 
                value="player-selections" 
                className="border border-border/60 rounded-lg px-3"
                style={{
                  backgroundColor: "hsla(35, 30%, 80%, 0.45)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ffffff' }}>
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

            <button
              type="button"
              onClick={() => setIsStandingsDialogOpen(true)}
              className="w-full border border-border/60 rounded-lg px-3 py-2 text-left"
              style={{
                backgroundColor: "hsla(35, 30%, 80%, 0.45)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ffffff' }}>
                  <Users className="h-4 w-4" />
                  <span>Player Standings</span>
                </div>
              </div>
            </button>

            {isCurrentUserGameMaster && (
              <AccordionItem 
                value="gm-controls" 
                className="border border-border/60 rounded-lg px-3"
                style={{
                  backgroundColor: "hsla(35, 30%, 80%, 0.45)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ffffff' }}>
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

            <AccordionItem 
              value="navigation" 
              className="border border-border/60 rounded-lg px-3"
              style={{
                backgroundColor: "hsla(35, 30%, 80%, 0.45)",
                backdropFilter: "blur(2px)",
              }}
            >
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ffffff' }}>
                  <Menu className="h-4 w-4" />
                  <span>Navigation</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex justify-center pt-2">
                  <Button onClick={() => router.push('/')} variant="outline" size="lg" className="w-full">
                    <Castle className="mr-2 h-5 w-5" /> Back to Main Screen
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Player Standings Dialog */}
      <Dialog
        open={isStandingsDialogOpen}
        onOpenChange={(open) => setIsStandingsDialogOpen(open)}
      >
        <DialogContent
          className="!fixed inset-0 w-screen h-[100dvh] max-w-none max-h-none m-0 rounded-none px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-[14vw] sm:pt-[11vw] md:pt-20 !translate-x-0 !translate-y-0 flex flex-col border-4 border-amber-800/60 [&>button]:text-amber-900 [&>button]:hover:text-amber-950 [&>button]:hover:bg-amber-200/50 relative"
          style={{
            backgroundImage: "url('/parchment-background.png')",
            backgroundRepeat: "repeat",
            backgroundPosition: "center center",
            backgroundSize: "cover",
          }}
        >
          <DialogHeader className="flex-shrink-0 relative z-10 bg-hunch-parchment p-4 sm:p-6 rounded-lg border-2 border-amber-800/60 shadow-lg">
            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-headline text-amber-900 flex items-center justify-center gap-2 sm:gap-3 text-center drop-shadow-sm">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-900" />
              Player Standings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4 flex-1 overflow-y-auto relative z-10 max-w-6xl mx-auto w-full">
            <PlayerStatusDisplay
              key={standingsKey}
              players={admittedPlayersFiltered}
              gameMasterId={gameData.gameMasterId}
              jackpotAmount={gameData.jackpotAmount || 0}
            />
          </div>

          {/* Close button */}
          <div className="flex justify-center mt-6 flex-shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => setIsStandingsDialogOpen(false)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-900 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              }}
              aria-label="Close Player Standings"
            >
              <X className="h-8 w-8 sm:h-10 sm:w-10" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
              className="!fixed inset-0 w-screen h-[100dvh] max-w-none max-h-none m-0 rounded-none px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-[calc(14vw+50px)] sm:pt-[calc(11vw+50px)] md:pt-28 !translate-x-0 !translate-y-0 flex flex-col border-4 border-amber-800/60 [&>button]:text-amber-900 [&>button]:hover:text-amber-950 [&>button]:hover:bg-amber-200/50 relative"
              style={{
                backgroundImage: "url('/parchment-background.png')",
                backgroundRepeat: 'repeat',
                backgroundPosition: 'center center',
                backgroundSize: 'cover',
              }}
              onInteractOutside={(event) => event.preventDefault()}
            >
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
              <div ref={contentRef} className="space-y-4 flex-1 overflow-y-auto relative z-10">
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

                {/* Character Reveal Header */}
                <DialogHeader className="relative z-10 bg-hunch-parchment p-4 sm:p-6 rounded-lg border-2 border-amber-800/60 shadow-lg">
                  <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-headline text-amber-900 flex items-center justify-center gap-2 sm:gap-3 text-center drop-shadow-sm">
                    {revealedCharacter?.icon && <revealedCharacter.icon className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-amber-900" />}
                    {revealedCharacter?.name || 'Character'} Revealed!
                  </DialogTitle>
                  <DialogDescription className="text-base sm:text-lg font-body text-amber-800 text-center">
                    Character effects have been applied.
                  </DialogDescription>
                </DialogHeader>
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
                  <div className="bg-hunch-parchment p-3 sm:p-4 rounded-lg border border-amber-800/10 shadow-lg">
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
                    ) : revealedCharacter.id === 'magician' ? (
                      <ul className="font-body text-base sm:text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-Can force a character of choice to a player in the next round</li>
                        )}
                        {playersWhoChoseCharacter.length >= 1 && (
                          <li className="text-red-600">-Paid half the coins of their dice roll</li>
                        )}
                        {playersWhoChoseCharacter.length >= 2 && (
                          <li className="text-red-600">-Can't force a player to choose a specific character</li>
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

                {/* Magician Dice Rolls */}
                {revealedCharacter?.id === 'magician' && gameData.magicianDiceRolls?.[dayKey] && (() => {
                  const magicianRolls = Object.entries(gameData.magicianDiceRolls[dayKey]);
                  const magicianCount = magicianRolls.length;
                  // Calculate scaling: base size for 2 magicians, scale down for more
                  const scaleFactor = magicianCount > 2 ? Math.min(1, 2 / magicianCount) : 1;
                  const cardMinWidth = magicianCount > 2 ? `${140 * scaleFactor}px` : '140px';
                  const diceSize = magicianCount > 2 ? `${64 * scaleFactor}px` : '64px';
                  const diceTextSize = magicianCount > 2 ? 'text-2xl' : 'text-3xl';
                  const costTextSize = magicianCount > 2 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl';
                  const playerNameSize = magicianCount > 2 ? 'text-xs sm:text-sm' : 'text-sm sm:text-base';
                  const cardPadding = magicianCount > 2 ? 'p-3' : 'p-4';
                  const gapSize = magicianCount > 2 ? 'gap-2 sm:gap-3' : 'gap-4';
                  const nameContainerHeight = magicianCount > 2 ? `${48 * scaleFactor}px` : '48px';
                  
                  return (
                    <div className="bg-hunch-parchment p-3 sm:p-4 rounded-lg border border-amber-800/10 shadow-lg">
                      <h3 className="font-headline text-lg sm:text-xl font-semibold mb-4 text-gray-900">Magician Dice Rolls:</h3>
                      <div className={`flex flex-wrap ${gapSize} justify-center sm:justify-start`}>
                        {magicianRolls.map(([playerId, diceRollData]) => {
                          const magicianPlayer = admittedPlayersFiltered.find(p => p.id === playerId);
                          if (!magicianPlayer || !diceRollData) return null;
                          
                          return (
                            <div 
                              key={playerId} 
                              className={`flex flex-col items-center ${cardPadding} bg-amber-900/60 rounded-lg border-2 border-primary/50`}
                              style={{ 
                                minWidth: cardMinWidth,
                                flex: magicianCount > 2 ? `0 0 calc(${100 / magicianCount}% - ${magicianCount === 3 ? '12px' : '16px'})` : undefined,
                                maxWidth: magicianCount > 2 ? `calc(${100 / magicianCount}% - ${magicianCount === 3 ? '12px' : '16px'})` : undefined
                              }}
                            >
                              <div className="mb-2 flex items-center justify-center" style={{ minHeight: nameContainerHeight }}>
                                <p className={`font-body ${playerNameSize} font-semibold text-white drop-shadow-md text-center`}>
                                  {magicianPlayer.screenName}
                                </p>
                              </div>
                              <div 
                                className="flex items-center justify-center border-3 border-primary rounded-lg bg-hunch-parchment mb-3 shadow-md"
                                style={{ width: diceSize, height: diceSize }}
                              >
                                <span className={`${diceTextSize} font-bold text-gray-900 flex items-center justify-center gap-0.5 leading-none`}>
                                  <span className="text-base sm:text-lg">🎲</span>
                                  <span>{diceRollData.diceRoll}</span>
                                </span>
                              </div>
                              <div className="text-center">
                                <p className={`font-body ${costTextSize} font-bold text-red-600`}>
                                  -{diceRollData.cost}
                                </p>
                                <p className="font-body text-xs text-muted-foreground">coins</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end mt-4 sm:mt-6 flex-shrink-0 relative z-10">
                {isCurrentUserGameMaster ? (
                  <Button 
                    onClick={async () => {
                      // Check if there's a next character to reveal
                      const nextCharacterId = gameActions.getNextCharacterToReveal(gameData.activelyRevealedCharacterId);
                      
                      // If there's a next character and user is GameMaster, auto-process it
                      if (nextCharacterId && isCurrentUserGameMaster && !gameData.playerAwaitingTargetSelection) {
                        setIsProcessingNextCharacter(true);
                        try {
                          await gameActions.handleProcessCharacterEffect();
                          // Dialog will automatically reopen with new character due to useEffect
                          // Don't close the dialog - let it update with new content
                        } catch (error) {
                          console.error('Error processing next character:', error);
                          setIsRevealDialogOpen(false);
                        } finally {
                          setIsProcessingNextCharacter(false);
                        }
                      } else {
                        // No next character - all characters revealed, proceed directly to Step 5
                        setIsProcessingNextCharacter(true);
                        setIsRevealDialogOpen(false);
                        try {
                          await gameActions.handleRevealDayResults();
                        } catch (error) {
                          console.error('Error revealing day results:', error);
                        } finally {
                          setIsProcessingNextCharacter(false);
                        }
                      }
                    }}
                    disabled={isProcessingNextCharacter}
                    size="lg" 
                    className="font-headline w-full sm:w-auto bg-hunch-parchment text-amber-900 hover:bg-hunch-parchment border-2 border-amber-800/60 shadow-lg font-bold text-lg sm:text-xl disabled:opacity-50"
                    style={{ backgroundColor: 'hsl(40, 75%, 94%)' }}
                  >
                    {isProcessingNextCharacter ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                        Processing...
                      </>
                    ) : (() => {
                      const nextCharacterId = gameActions.getNextCharacterToReveal(gameData.activelyRevealedCharacterId);
                      if (nextCharacterId && isCurrentUserGameMaster && !gameData.playerAwaitingTargetSelection) {
                        return `Continue to ${CHARACTERS_LIST.find(c => c.id === nextCharacterId)?.name || 'Next Character'}`;
                      }
                      return 'Reveal Day Results';
                    })()}
                  </Button>
                ) : (
                  <div className="font-body text-base sm:text-lg text-amber-800 text-center w-full sm:w-auto px-4 py-2">
                    Waiting for game host to continue...
                  </div>
                )}
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


