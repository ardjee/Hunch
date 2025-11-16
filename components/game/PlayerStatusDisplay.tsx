
'use client';

import React from 'react';
import type { Player } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'; // Removed CardTitle
import { Heart, Coins, Crown as GameMasterCrown, Gem } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PlayerStatusListProps {
  players: Player[];
  gameMasterId?: string;
  jackpotAmount?: number;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

const PlayerStatusDisplay: React.FC<PlayerStatusListProps> = ({ players, gameMasterId, jackpotAmount = 0 }) => {
  const sortedPlayers = [...players].sort((a, b) => b.lives - a.lives);

  return (
    <Card className="hunch-box bg-card text-card-foreground">
      <CardHeader className="p-3 text-center">
        <div className="inline-block mx-auto title-plaque">
            <span className="text-amber-700">PLAYER STANDINGS</span>
        </div>
        <CardDescription className="text-xs font-body text-muted-foreground mt-1 italic">
            Lives, coins, and the grand jackpot.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 p-3 bg-amber-100/60 rounded-md text-center border border-amber-600/50 shadow-inner-sm">
          <div className="flex items-center justify-center text-base font-headline text-amber-800">
            <Gem className="mr-2 h-5 w-5 text-amber-700" />
            <span>JACKPOT: {jackpotAmount} Coins</span>
          </div>
        </div>
        {sortedPlayers.length === 0 ? (
          <p className="font-body text-muted-foreground text-center py-4">No players have yet joined this quest.</p>
        ) : (
          <ul className="space-y-2.5">
            {sortedPlayers.map((player) => (
              <li key={player.id} className="flex items-center justify-between p-2.5 bg-card rounded-md border border-border/70 shadow-sm hover:bg-muted/30 transition-colors">
                <div className="flex items-center space-x-2.5">
                  <Avatar className="h-8 w-8 border border-border/50">
                    <AvatarImage src={`https://placehold.co/40x40/f0e4c0/8c5a2b.png?text=${getInitials(player.screenName)}`} alt={player.screenName} data-ai-hint="avatar medieval" />
                    <AvatarFallback className="text-xs bg-amber-200 text-amber-800">{getInitials(player.screenName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-headline text-amber-800 text-sm tracking-wide">{player.screenName}</span>
                    {player.id === gameMasterId && (
                       <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <GameMasterCrown className="inline-block ml-1.5 h-3.5 w-3.5 text-yellow-600 align-middle" />
                          </TooltipTrigger>
                          <TooltipContent className="font-body bg-popover text-popover-foreground border-border text-xs"><p>Game Master</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-xs font-body">
                  <div className="flex items-center text-amber-700">
                    <Heart className="mr-1 h-3.5 w-3.5 fill-current" /> {player.lives}
                  </div>
                  <div className="flex items-center text-amber-700">
                    <Coins className="mr-1 h-3.5 w-3.5" /> {player.dailyCoins}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerStatusDisplay;
