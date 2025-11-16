
'use client';

import React from 'react';
import type { Player } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, Loader2, UserCheck } from 'lucide-react';
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

interface JudgeTargetSelectionProps {
  players: Player[];
  onSelectPlayer: (targetPlayerId: string) => Promise<void>;
  isLoading: boolean;
  currentJudgeScreenName: string;
}

const JudgeTargetSelection: React.FC<JudgeTargetSelectionProps> = ({
  players,
  onSelectPlayer,
  isLoading,
  currentJudgeScreenName,
}) => {
  const handlePlayerClick = async (playerId: string) => {
    if (isLoading) return;
    await onSelectPlayer(playerId);
  };

  return (
    <Card className="hunch-box">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary flex items-center">
          <Award className="w-6 h-6 mr-2 text-accent" />
          {currentJudgeScreenName}: Award an Extra Life
        </CardTitle>
        <CardDescription>
          As The Judge, select a player (including yourself) to receive one additional life for the endgame. This decision is final.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-muted-foreground text-center">No players available to award a life to.</p>
        ) : (
          <ScrollArea className="max-h-[65vh] md:h-[300px] pr-3">
            <div className="space-y-3">
              {players.map((player) => (
                <Card
                  key={player.id}
                  className={`transition-all duration-150 ease-in-out border-2 
                    ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-accent/70'
                    } bg-card border-transparent`}
                  onClick={() => !isLoading && handlePlayerClick(player.id)}
                >
                  <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-3 px-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(player.screenName)}`} alt={player.screenName} data-ai-hint="avatar profile" />
                        <AvatarFallback>{getInitials(player.screenName)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-md font-semibold">{player.screenName}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground pt-0 pb-3 px-3">
                    Award an extra life to {player.screenName}.
                  </CardContent>
                  <div className="px-3 pb-3">
                    <Button
                      className="w-full hunch-glow"
                      variant="secondary"
                      disabled={isLoading}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click if button is clicked
                        handlePlayerClick(player.id);
                      }}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <UserCheck className="mr-2 h-4 w-4" /> Award Life to {player.screenName}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default JudgeTargetSelection;


