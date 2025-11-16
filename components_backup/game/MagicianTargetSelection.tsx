
'use client';

import React, { useState } from 'react';
import type { Player } from '@/lib/types';
import type { Character } from '@/lib/characters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, Loader2, UserCheck, ShieldQuestion } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getInitials = (name: string) => {
  if (!name) return '';
  const names = name.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

interface MagicianTargetSelectionProps {
  players: Player[];
  characters: Character[];
  onSelectTarget: (targetPlayerId: string, forcedCharacterId: string) => Promise<void>;
  isLoading: boolean;
  currentMagicianScreenName: string;
}

const MagicianTargetSelection: React.FC<MagicianTargetSelectionProps> = ({
  players,
  characters,
  onSelectTarget,
  isLoading,
  currentMagicianScreenName,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleSelectCharacter = async (characterId: string) => {
    if (!selectedPlayer || isLoading) return;
    await onSelectTarget(selectedPlayer.id, characterId);
  };

  if (selectedPlayer) {
    return (
      <Card className="hunch-box">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-primary flex items-center">
            <ShieldQuestion className="w-6 h-6 mr-2 text-accent" />
            Enchant {selectedPlayer.screenName}
          </CardTitle>
          <CardDescription>
            You have chosen to enchant {selectedPlayer.screenName}. Now, select the character they will be forced to become on the next day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[65vh] md:h-[300px] pr-3">
            <div className="space-y-3">
              {characters.map((character) => (
                <Button
                  key={character.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-2"
                  onClick={() => handleSelectCharacter(character.id)}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <character.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-semibold">{character.name}</p>
                    <p className="text-xs text-muted-foreground font-normal whitespace-normal">{character.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
          <Button variant="ghost" onClick={() => setSelectedPlayer(null)} className="w-full mt-4">
            Go Back to Player Selection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hunch-box">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary flex items-center">
          <Wand2 className="w-6 h-6 mr-2 text-accent" />
          {currentMagicianScreenName}: Choose Your Target
        </CardTitle>
        <CardDescription>
          As The Magician, select a player to enchant. They will be forced to play a character of your choosing on the next day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-muted-foreground text-center">No other players available to enchant.</p>
        ) : (
          <ScrollArea className="max-h-[65vh] md:h-[300px] pr-3">
            <div className="space-y-3">
              {players.map((player) => (
                <Card
                  key={player.id}
                  className={`transition-all duration-150 ease-in-out border-2 ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-accent/70'
                  } bg-card border-transparent`}
                  onClick={() => !isLoading && handleSelectPlayer(player)}
                >
                  <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-3 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(player.screenName)}`} alt={player.screenName} data-ai-hint="avatar profile" />
                      <AvatarFallback>{getInitials(player.screenName)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-md font-semibold">{player.screenName}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground pt-0 pb-3 px-3">
                    Enchant {player.screenName} and choose their next role.
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default MagicianTargetSelection;
