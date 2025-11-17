
'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import PlayerStatusDisplay from '@/components/game/PlayerStatusDisplay';
import GameMasterControls from '@/components/game/GameMasterControls';
import PlayerSelectionStatusList from '@/components/game/PlayerSelectionStatusList';
import { Button } from '@/components/ui/button';
import { useGameData } from './useGameData';
import { useAiPlayersController } from '@/hooks/useAiPlayersController';
import { Loader2, Users, Castle, Settings, Menu } from 'lucide-react';
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

        return (
          <Dialog
            open={isRevealDialogOpen}
            onOpenChange={(open) => {
              if (!open) setIsRevealDialogOpen(false);
            }}
          >
            <DialogContent
              className="max-w-2xl max-h-[90vh] overflow-y-auto"
              onInteractOutside={(event) => event.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle className="text-4xl font-headline text-white flex items-center justify-center gap-3 text-center">
                  {revealedCharacter?.icon && <revealedCharacter.icon className="h-10 w-10" />}
                  {revealedCharacter?.name || 'Character'} Revealed!
                </DialogTitle>
                <DialogDescription className="text-lg font-body text-gray-300 text-center">
                  Character effects have been applied.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {wasStolenFromByThief && thiefCount === 1 && (
                  <div className="bg-hunch-parchment p-4 rounded-lg border-2 border-primary/30">
                    {playersWhoChoseCharacter.length > 0 ? (
                      <p className="font-body text-2xl font-bold text-red-600 text-center">
                        -🔪 The thief struck successfully!
                      </p>
                    ) : (
                      <p className="font-body text-2xl font-bold text-green-600 text-center">
                        -🔪 The thief missed!
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-hunch-parchment p-4 rounded-lg border border-border [&_*]:!text-gray-900">
                  <h3 className="font-headline text-xl font-semibold mb-2">
                    Players Who Chose This Character:
                  </h3>
                  {playersWhoChoseCharacter.length > 0 ? (
                    <ul className="list-none pl-0 space-y-2">
                      {playersWhoChoseCharacter.map((player) => (
                        <li key={player.id} className="font-body text-lg flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border/50">
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
                    <p className="font-body text-lg">No one chose this character.</p>
                  )}
                </div>

                {revealedCharacter && (
                  <div className="bg-hunch-parchment p-4 rounded-lg border-2 border-primary/30">
                    <h3 className="font-headline text-xl font-semibold mb-2 text-gray-900">Character Effects:</h3>
                    {revealedCharacter.id === 'monarch' ? (
                      <ul className="font-body text-lg leading-relaxed space-y-2 list-none pl-0">
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
                      </ul>
                    ) : revealedCharacter.id === 'merchant' ? (
                      <ul className="font-body text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-Daily coins are doubled next day</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <li className="text-red-600">-No daily coins next day</li>
                        )}
                      </ul>
                    ) : revealedCharacter.id === 'decoy' ? (
                      <ul className="font-body text-lg leading-relaxed space-y-2 list-none pl-0">
                        {playersWhoChoseCharacter.length === 1 && (
                          <li className="text-green-600">-No chores have to be done in real life</li>
                        )}
                        {playersWhoChoseCharacter.length > 1 && (
                          <li className="text-red-600">-They have to do all the chores in real life</li>
                        )}
                      </ul>
                    ) : (
                      <p className="font-body text-lg leading-relaxed whitespace-pre-line text-gray-900">
                        {revealedCharacter.description}
                      </p>
                    )}
                    {wasStolenFromByThief && thiefCount === 1 && playersWhoChoseCharacter.length > 0 && (
                      <p className="font-body text-lg text-red-600 mt-2">-The thief stole all coins</p>
                    )}
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


