
'use client';

import type { Character } from '@/lib/characters';
import type { Player, PlayerCharacterSelection, Game } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Users, Loader2, UserCheck, UserX, ShieldQuestion, HandCoins, XCircle, Eye, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useCallback, useEffect } from 'react';
import { CHARACTERS_LIST, CHARACTER_REVEAL_ORDER } from '@/lib/characters';
import PlayerSelectionStatusList from '@/components/game/PlayerSelectionStatusList';
import useEmblaCarousel from 'embla-carousel-react';
import DiceRoll from '@/components/game/DiceRoll';


const CharacterDisplayCard: React.FC<{
  character: Character;
  onCardClick: () => void;
  onButtonClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isDisabled: boolean;
  isSelected: boolean;
  isLoading: boolean;
  buttonTextPrefix: string;
  showNavButtons?: boolean;
  onPrevClick?: () => void;
  onNextClick?: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
}> = ({ character, onCardClick, onButtonClick, isDisabled, isSelected, isLoading, buttonTextPrefix, showNavButtons, onPrevClick, onNextClick, isPrevDisabled, isNextDisabled }) => {
  const bucket = "the-hunch-3cdb0.appspot.com";
  const buttonImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/button1.png?alt=media`;
  const characterName = character.name.replace(/^The\s/, '');

  return (
    <Card
      className={`relative flex flex-col w-full overflow-hidden rounded-lg shadow-parchment border-2 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-primary/30
        ${isDisabled && !isSelected ? 'opacity-60' : ''}
        ${isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'bg-card border-amber-700 hover:border-amber-600'}`}
      style={{ width: '100%', minWidth: 0 }}
    >
      {/* Navigation Buttons inside the card */}
      {showNavButtons && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 rounded-full bg-background/90 backdrop-blur-sm shadow-lg hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onPrevClick?.();
            }}
            disabled={isPrevDisabled}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 rounded-full bg-background/90 backdrop-blur-sm shadow-lg hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onNextClick?.();
            }}
            disabled={isNextDisabled}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      <div className="relative w-full h-64 bg-muted/30" style={{ minHeight: '16rem' }}>
        <Image
          src={character.imageUrl}
          alt={character.name}
          fill
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          className="rounded-t-md"
          data-ai-hint={character.dataAiHint}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
        />
      </div>
      <div className="p-4 flex flex-col items-center flex-1 text-center">
        <p className="text-sm font-body text-muted-foreground">The</p>
        <h3 className="text-2xl font-headline text-card-foreground mt-0 mb-1 tracking-wide">
          {characterName}
        </h3>
        <div className="relative h-6 w-6 text-accent mb-3">
          <character.icon className="w-full h-full" />
        </div>
        <div className="text-xs font-body text-muted-foreground text-left leading-snug mb-3 flex-grow">
          {character.description}
        </div>
        <div className="w-full mt-auto flex items-center justify-center">
          <div className="relative p-2">
            <div className="absolute inset-0 rounded-full border-4 border-primary shadow-lg ring-2 ring-primary/30"></div>
            <Button
              className="relative w-full font-headline text-lg py-3 bg-transparent border-none shadow-none hover:bg-transparent text-primary-foreground mx-1 rounded-full"
              style={{
                backgroundImage: `url('${buttonImageUrl}')`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              disabled={isDisabled && !isSelected}
              onClick={onButtonClick}
            >
              {isLoading && !isSelected ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isSelected ? <CheckCircle className="mr-2 h-5 w-5" /> : null}
              <span className="font-bold text-xl">{isSelected ? 'Selected' : `${buttonTextPrefix} ${characterName}`}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface CharacterSelectionProps {
  characters: Character[];
  onSelectCharacter: (selection: PlayerCharacterSelection) => Promise<void>;
  selectedCharacterInfoThisDay: PlayerCharacterSelection | undefined;
  isLoadingSelection: boolean;
  currentDay: number;
  displayRoundNumber: number;
  characterSelectionStatus: {
    totalAdmittedPlayers: number;
    playersWhoSelectedForCurrentDay: number;
  };
  players: Player[];
  selectionsForCurrentDay: { [playerId: string]: PlayerCharacterSelection; };
  gameData?: Game; // Make gameData optional as it's only used for Step 4 logic here
  isCurrentUserGameMaster?: boolean; // Optional
  getNextCharacterToReveal?: (currentlyRevealedId: string | null | undefined) => string | null; // Optional
  forcedCharacterId?: string; // Optional: The character this player is forced to select
}

const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  characters,
  onSelectCharacter,
  selectedCharacterInfoThisDay,
  isLoadingSelection,
  currentDay,
  displayRoundNumber,
  characterSelectionStatus,
  players,
  selectionsForCurrentDay,
  gameData,
  isCurrentUserGameMaster,
  getNextCharacterToReveal,
  forcedCharacterId,
}) => {
  const [isPickingThiefTarget, setIsPickingThiefTarget] = useState(false);

  // Thief target selection carousel hooks (always called)
  const availableTargets = characters.filter(c => c.id !== 'thief');
  const [thiefEmblaRef, thiefEmblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps'
  });
  const [thiefSelectedIndex, setThiefSelectedIndex] = useState(0);
  const [thiefScrollSnaps, setThiefScrollSnaps] = useState<number[]>([]);

  const thiefScrollPrev = useCallback(() => thiefEmblaApi && thiefEmblaApi.scrollPrev(), [thiefEmblaApi]);
  const thiefScrollNext = useCallback(() => thiefEmblaApi && thiefEmblaApi.scrollNext(), [thiefEmblaApi]);
  const thiefScrollTo = useCallback((index: number) => thiefEmblaApi && thiefEmblaApi.scrollTo(index), [thiefEmblaApi]);

  const thiefOnSelect = useCallback(() => {
    if (!thiefEmblaApi) return;
    setThiefSelectedIndex(thiefEmblaApi.selectedScrollSnap());
  }, [thiefEmblaApi]);

  useEffect(() => {
    if (!thiefEmblaApi) return;
    setThiefScrollSnaps(thiefEmblaApi.scrollSnapList());
    thiefEmblaApi.on('select', thiefOnSelect);
    thiefOnSelect();

    return () => {
      thiefEmblaApi.off('select', thiefOnSelect);
    };
  }, [thiefEmblaApi, thiefOnSelect]);

  // Default character selection carousel hooks (always called)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps'
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleCharacterCardClick = async (character: Character) => {
    if (selectedCharacterInfoThisDay || isLoadingSelection || forcedCharacterId) return;

    if (character.id === 'thief') {
      setIsPickingThiefTarget(true);
    } else {
      await onSelectCharacter({ characterId: character.id });
    }
  };

  const handleThiefTargetSelection = async (targetCharacterId: string) => {
    if (isLoadingSelection) return;
    await onSelectCharacter({ characterId: 'thief', thiefTargetCharacterId: targetCharacterId });
    setIsPickingThiefTarget(false);
  };

  const cancelThiefTargetSelection = () => {
    setIsPickingThiefTarget(false);
  };


  // Step 4: Character Effects Phase display
  if (gameData && gameData.currentDayStep === 4 && getNextCharacterToReveal && typeof isCurrentUserGameMaster === 'boolean') {
    const revealedCharacterInfo = CHARACTERS_LIST.find(c => c.id === gameData.activelyRevealedCharacterId);
    const dayKey = String(gameData.currentDay);
    const selectionsForThisDay = gameData.playerCharacterSelectionsByDay?.[dayKey] || {};
    const playersWhoChoseRevealedCharacter = revealedCharacterInfo
      ? players.filter(p => selectionsForThisDay[p.id]?.characterId === revealedCharacterInfo.id)
      : [];

    const descriptionElements: React.ReactNode[] = [];

    if (gameData.activelyRevealedCharacterId) {
      descriptionElements.push(<span key="s1_revealed">{`The abilities of ${revealedCharacterInfo?.name || 'Character'} have been applied.`}</span>);
    } else {
      descriptionElements.push(<span key="s1_pending">{"Character effects phase has begun. Waiting for GM to start revealing effects."}</span>);
    }

    if (gameData.activelyRevealedCharacterId) {
      if (playersWhoChoseRevealedCharacter.length > 0) {
        descriptionElements.push(<span key="s2_chosen">{`Chosen by ${playersWhoChoseRevealedCharacter.map(p => p.screenName).join(', ')}.`}</span>);
      } else {
        descriptionElements.push(<span key="s2_not_chosen">{'No one chose this character.'}</span>);
      }
    }
    
    let statement3Node: React.ReactNode = null;
    if (gameData.playerAwaitingTargetSelection?.role === 'judge') {
        const judgePlayer = players.find(p => p.id === gameData.playerAwaitingTargetSelection?.playerId);
        if (judgePlayer) { 
             statement3Node = <span key="s3_judge_wait">{`Waiting for ${judgePlayer.screenName} (The Judge) to award an extra life.`}</span>;
        }
    } else if (gameData.playerAwaitingTargetSelection?.role === 'magician') {
        const magicianPlayer = players.find(p => p.id === gameData.playerAwaitingTargetSelection?.playerId);
        if (magicianPlayer) {
             statement3Node = <span key="s3_magician_wait">{`Waiting for ${magicianPlayer.screenName} (The Magician) to enchant a player.`}</span>;
        }
    } else if (gameData.activelyRevealedCharacterId) { 
        const nextCharToRevealId = getNextCharacterToReveal(gameData.activelyRevealedCharacterId);
        if (isCurrentUserGameMaster) {
            if (nextCharToRevealId) {
                statement3Node = <span key="s3_gm_next">{`Next up: ${CHARACTERS_LIST.find(c => c.id === nextCharToRevealId)?.name || 'Next Character'}.`}</span>;
            } else { 
                statement3Node = <span key="s3_gm_all_done">{"All character effects for today processed. Ready to reveal day results (Step 5)."}</span>;
            }
        } else { 
            if (nextCharToRevealId) {
                statement3Node = <span key="s3_player_next">{"Waiting for GM to process next character effect."}</span>;
            } else { 
                statement3Node = <span key="s3_player_all_done">{"All character effects processed. Waiting for GM to reveal day results (Step 5)."}</span>;
            }
        }
    }
    if(statement3Node) descriptionElements.push(statement3Node);
    
    const validDescriptionElements = descriptionElements.filter(el => el);

    return (
        <Card className="hunch-box">
        <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
            <Eye className="w-6 h-6 mr-2 text-accent" />
             {gameData.activelyRevealedCharacterId ? `Effect Processed: ${revealedCharacterInfo?.name}` : "Character Effects Phase"} (Step {displayRoundNumber})
            </CardTitle>
             <CardDescription className="font-body">
              {validDescriptionElements.map((element, index) => (
                <React.Fragment key={`desc_frag_${index}`}>
                  {element}
                  {index < validDescriptionElements.length - 1 && <br />}
                </React.Fragment>
              ))}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Magician Dice Rolls */}
            {revealedCharacterInfo?.id === 'magician' && gameData.magicianDiceRolls?.[dayKey] && (
              <div className="my-6">
                {playersWhoChoseRevealedCharacter.length === 1 ? (
                  // Single magician - show large dice roll
                  (() => {
                    const magicianPlayer = playersWhoChoseRevealedCharacter[0];
                    const diceRollData = gameData.magicianDiceRolls[dayKey][magicianPlayer.id];
                    if (diceRollData) {
                      return (
                        <DiceRoll
                          diceRoll={diceRollData.diceRoll}
                          cost={diceRollData.cost}
                          playerName={magicianPlayer.screenName}
                          size="single"
                        />
                      );
                    }
                    return null;
                  })()
                ) : (
                  // Multiple magicians - show overview
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center mb-4">Magician Dice Rolls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playersWhoChoseRevealedCharacter.map(player => {
                        const diceRollData = gameData.magicianDiceRolls?.[dayKey]?.[player.id];
                        if (diceRollData) {
                          return (
                            <DiceRoll
                              key={player.id}
                              diceRoll={diceRollData.diceRoll}
                              cost={diceRollData.cost}
                              playerName={player.screenName}
                              size="overview"
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
        </CardContent>
        </Card>
    );
  }

  // Step 3: Character Selected by Current Player
  if (selectedCharacterInfoThisDay) {
    const selectedChar = characters.find(c => c.id === selectedCharacterInfoThisDay.characterId);
    let description = `You have chosen: <strong class="text-primary">${selectedChar?.name || 'Unknown Character'}</strong>.`;
    if (selectedCharacterInfoThisDay.characterId === 'thief' && selectedCharacterInfoThisDay.thiefTargetCharacterId) {
        const targetChar = characters.find(c => c.id === selectedCharacterInfoThisDay.thiefTargetCharacterId);
        description += ` You plan to rob <strong class="text-accent">The ${targetChar?.name || 'Unknown Target'}</strong>.`;
    }

    const allPlayersSelectedCharacterThisDay = characterSelectionStatus.totalAdmittedPlayers > 0 &&
    characterSelectionStatus.playersWhoSelectedForCurrentDay === characterSelectionStatus.totalAdmittedPlayers;

    if (allPlayersSelectedCharacterThisDay) {
        description += `<br />All players have selected. Waiting for the Game Master to start processing character effects (Step 4).`;
    } else {
        description += `<br />Waiting for other players to make their choice.`;
    }

    return (
      <Card className="hunch-box shadow-parchment bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-primary flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-primary" />
            Character Selected (Step {displayRoundNumber}) for Day {currentDay}
          </CardTitle>
          <CardDescription className="font-body" dangerouslySetInnerHTML={{ __html: description }} />
        </CardHeader>
        <CardContent>
          <PlayerSelectionStatusList
             currentDay={currentDay}
             characterSelectionStatus={characterSelectionStatus}
             players={players}
             selectionsForCurrentDay={selectionsForCurrentDay}
             isEmbedded
          />
        </CardContent>
      </Card>
    );
  }

  // Step 3: Thief Target Selection
  if (isPickingThiefTarget) {

    return (
      <Card className="shadow-parchment bg-card border-accent/50 hunch-box">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-accent flex items-center">
            <HandCoins className="w-6 h-6 mr-2" />
            Thief: Choose Target (Part of Step {displayRoundNumber})
          </CardTitle>
          <CardDescription className="font-body">
            You've chosen to be The Thief. Swipe to browse and select which character type you will attempt to rob today.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-[60%] -translate-y-1/2 z-30 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 border-2 border-primary-foreground h-14 w-14"
            onClick={thiefScrollPrev}
            disabled={thiefSelectedIndex === 0}
          >
            <ChevronLeft className="h-7 w-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-[60%] -translate-y-1/2 z-30 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 border-2 border-primary-foreground h-14 w-14"
            onClick={thiefScrollNext}
            disabled={thiefSelectedIndex === availableTargets.length - 1}
          >
            <ChevronRight className="h-7 w-7" />
          </Button>

          {/* Carousel Container */}
          <div className="mb-4">
            <div className="overflow-hidden" ref={thiefEmblaRef}>
              <div className="flex touch-pan-y">
                {availableTargets.map((character) => (
                  <div key={character.id} className="flex-[0_0_100%] min-w-0">
                    <CharacterDisplayCard
                      character={character}
                      onCardClick={() => {}}
                      onButtonClick={(e) => {
                          e.stopPropagation();
                          handleThiefTargetSelection(character.id);
                      }}
                      isDisabled={isLoadingSelection}
                      isSelected={false}
                      isLoading={isLoadingSelection}
                      buttonTextPrefix="Rob"
                      showNavButtons={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots Navigation - below the carousel */}
            <div className="flex justify-center gap-2 mt-4">
              {thiefScrollSnaps.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === thiefSelectedIndex ? 'bg-accent w-6' : 'bg-accent/30'
                  }`}
                  onClick={() => thiefScrollTo(index)}
                />
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={cancelThiefTargetSelection} className="w-full font-headline">
            <XCircle className="mr-2 h-4 w-4" /> Cancel Thief Role
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Default - Choose Character (PlayerSelectionStatusList is now rendered by parent page.tsx for this view)

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Navigation Arrows */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-4 top-[60%] -translate-y-1/2 z-30 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 border-2 border-primary-foreground h-14 w-14"
        onClick={scrollPrev}
        disabled={selectedIndex === 0}
      >
        <ChevronLeft className="h-7 w-7" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute right-4 top-[60%] -translate-y-1/2 z-30 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 border-2 border-primary-foreground h-14 w-14"
        onClick={scrollNext}
        disabled={selectedIndex === characters.length - 1}
      >
        <ChevronRight className="h-7 w-7" />
      </Button>

      {/* Carousel Container */}
      <div className="w-full max-w-md mx-auto h-full flex items-center justify-center overflow-hidden px-4" ref={emblaRef}>
        <div className="flex h-full w-full">
          {characters.map((character, index) => (
            <div key={character.id} className="flex-[0_0_100%] min-w-0 w-full flex items-center justify-center p-4">
              <div className="w-full max-w-sm">
                <CharacterDisplayCard
                  character={character}
                  onCardClick={() => {}}
                  onButtonClick={(e) => {
                      e.stopPropagation();
                      handleCharacterCardClick(character);
                  }}
                  isDisabled={isLoadingSelection || !!selectedCharacterInfoThisDay || (!!forcedCharacterId && character.id !== forcedCharacterId)}
                  isSelected={selectedCharacterInfoThisDay?.characterId === character.id}
                  isLoading={isLoadingSelection && !selectedCharacterInfoThisDay}
                  buttonTextPrefix="Choose"
                  showNavButtons={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharacterSelection;
