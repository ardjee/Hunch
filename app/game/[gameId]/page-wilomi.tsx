
'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import PlayerStatusDisplay from '@/components/game/PlayerStatusDisplay';
import GameMasterControls from '@/components/game/GameMasterControls';
import PlayerSelectionStatusList from '@/components/game/PlayerSelectionStatusList';
import { Button } from '@/components/ui/button';
import { useGameData } from './useGameData';
import { Loader2, Users, Castle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerFooter,
    DrawerClose
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import CurrentRoundActions from '@/components/game/CurrentRoundActions';
import CharacterSelection from '@/components/game/CharacterSelection';
import JudgeTargetSelection from '@/components/game/JudgeTargetSelection';
import MagicianTargetSelection from '@/components/game/MagicianTargetSelection';
import DayResultsDisplay from '@/components/game/DayResultsDisplay';
import VoteSummaryDisplay from '@/components/game/VoteSummaryDisplay';
import { CHARACTERS_LIST } from '@/lib/characters';
import Image from 'next/image';


function ResponsiveDialog({
  trigger,
  title,
  children,
  isOpen,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">{children}</div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
}


function GamePageContent() {
  const router = useRouter();
  const {
    gameData,
    players,
    currentUserId,
    isLoading,
    error,
    isCurrentUserGameMaster,
    ...gameActions
  } = useGameData();

  const [isStandingsOpen, setIsStandingsOpen] = useState(false);
  const [lastRevealedCharacterId, setLastRevealedCharacterId] = useState<string | null | undefined>(null);
  const [isRevealDialogOpen, setIsRevealDialogOpen] = useState(false);
  
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
  const admittedPlayersFiltered = players.filter(p => p.isAdmitted);
  const characterSelectionStatus = {
    totalAdmittedPlayers: admittedPlayersFiltered.length,
    playersWhoSelectedForCurrentDay: Object.keys(selectionsForCurrentDayByPlayer).filter(pid => admittedPlayersFiltered.some(ap => ap.id === pid)).length,
  };
  
  const isCharacterSelectionPhase = gameData.currentDayStep === 3 && !selectedCharacterInfoThisDay;

  // Disable body scrolling during character selection
  useEffect(() => {
    if (isCharacterSelectionPhase) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCharacterSelectionPhase]);

  // Detect when a new character is revealed and show popup
  useEffect(() => {
    if (gameData?.currentDayStep === 4 && gameData.activelyRevealedCharacterId) {
      // Check if this is a new character reveal
      if (gameData.activelyRevealedCharacterId !== lastRevealedCharacterId) {
        setLastRevealedCharacterId(gameData.activelyRevealedCharacterId);
        setIsRevealDialogOpen(true);
      }
    } else {
      // Reset when not in step 4
      setLastRevealedCharacterId(null);
      setIsRevealDialogOpen(false);
    }
  }, [gameData?.activelyRevealedCharacterId, gameData?.currentDayStep, lastRevealedCharacterId]);
  
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
            activeChallengeDescription={currentChallengeDescription}
            activeChallengeActualResult={currentChallengeActualResult}
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
      <div className={`w-full ${isCharacterSelectionPhase ? 'h-[calc(100vh-4rem)] overflow-hidden' : 'space-y-6'}`}>
        <div className={isCharacterSelectionPhase ? 'h-full overflow-hidden' : ''}>
          {mainContent}
        </div>

        {!isCharacterSelectionPhase && (
          <>
            {gameData.currentDayStep === 3 && !selectedCharacterInfoThisDay && (
              <PlayerSelectionStatusList
                currentDay={gameData.currentDay}
                characterSelectionStatus={characterSelectionStatus}
                players={admittedPlayersFiltered}
                selectionsForCurrentDay={selectionsForCurrentDayByPlayer}
              />
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4 border-t border-border/50">
              <ResponsiveDialog
                isOpen={isStandingsOpen}
                onOpenChange={setIsStandingsOpen}
                title="Player Standings"
                trigger={<Button variant="outline" className="w-full sm:w-auto"><Users className="mr-2" /> Player Standings</Button>}
              >
                <PlayerStatusDisplay players={admittedPlayersFiltered} gameMasterId={gameData.gameMasterId} jackpotAmount={gameData.jackpotAmount || 0} />
              </ResponsiveDialog>
            </div>
          </>
        )}
      </div>

      {!isCharacterSelectionPhase && isCurrentUserGameMaster && (
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
      )}

      {!isCharacterSelectionPhase && (
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-md">
            <Button onClick={() => router.push('/')} variant="outline" size="lg" className="w-full">
              <Castle className="mr-2 h-5 w-5" /> Back to Main Screen
            </Button>
          </div>
        </div>
      )}

      {/* Character Reveal Dialog */}
      {gameData?.currentDayStep === 4 && gameData.activelyRevealedCharacterId && (() => {
        const revealedCharacter = CHARACTERS_LIST.find(c => c.id === gameData.activelyRevealedCharacterId);
        const dayKey = String(gameData.currentDay);
        const selectionsForThisDay = gameData.playerCharacterSelectionsByDay?.[dayKey] || {};
        const playersWhoChoseCharacter = revealedCharacter
          ? admittedPlayersFiltered.filter(p => selectionsForThisDay[p.id]?.characterId === revealedCharacter.id)
          : [];
        
        return (
          <Dialog open={isRevealDialogOpen} onOpenChange={(open) => {
            // Only allow closing via the Continue button, not by clicking outside
            if (!open) {
              setIsRevealDialogOpen(false);
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline text-primary flex items-center gap-2">
                  {revealedCharacter?.icon && <revealedCharacter.icon className="h-8 w-8" />}
                  {revealedCharacter?.name || 'Character'} Revealed!
                </DialogTitle>
                <DialogDescription className="text-base font-body">
                  Character effects have been applied
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {/* Character Image */}
                {revealedCharacter && (
                  <div className="relative w-full h-64 bg-muted/30 rounded-md overflow-hidden border-2 border-border">
                    <Image
                      src={revealedCharacter.imageUrl}
                      alt={revealedCharacter.name}
                      fill
                      style={{ objectFit: 'cover', objectPosition: 'top' }}
                      className="rounded-md"
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                    />
                  </div>
                )}

                {/* Who Chose This Character */}
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="font-headline text-lg font-semibold mb-2 text-primary">Players Who Chose This Character:</h3>
                  {playersWhoChoseCharacter.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {playersWhoChoseCharacter.map(player => (
                        <li key={player.id} className="font-body text-base">{player.screenName}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-body text-muted-foreground">No one chose this character.</p>
                  )}
                </div>

                {/* Character Effects */}
                {revealedCharacter && (
                  <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/30">
                    <h3 className="font-headline text-lg font-semibold mb-2 text-primary">Character Effects:</h3>
                    <p className="font-body text-base leading-relaxed whitespace-pre-line">
                      {revealedCharacter.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => setIsRevealDialogOpen(false)} size="lg" className="font-headline">
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

    