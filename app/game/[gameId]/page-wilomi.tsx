
'use client';

import { Suspense, useState, useMemo } from 'react';
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
import { CHARACTERS_LIST } from '@/lib/characters';


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
      </div>

      {isCurrentUserGameMaster && (
        <GameMasterControls
          gameData={gameData}
          players={admittedPlayersFiltered}
          characterSelectionStatus={characterSelectionStatus}
          isCurrentUserGameMaster={isCurrentUserGameMaster}
          handleProceedToCharacterSelectionPhase={gameActions.handleProceedToCharacterSelectionPhase}
          handleProcessCharacterEffect={gameActions.handleProcessCharacterEffect}
          handleRevealDayResults={gameActions.handleRevealDayResults}
          handleEndOfDayResolution={gameActions.handleEndOfDayResolution}
          getNextCharacterToReveal={gameActions.getNextCharacterToReveal}
          isLoadingProceedToCharacters={false}
          isLoadingCharacterProcessing={false}
          isLoadingDayResults={false}
          isLoadingEndOfDay={false}
          isLoadingJudgeSelection={false}
        />
      )}

      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-md">
          <Button onClick={() => router.push('/')} variant="outline" size="lg" className="w-full">
            <Castle className="mr-2 h-5 w-5" /> Back to Main Screen
          </Button>
        </div>
      </div>
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

    