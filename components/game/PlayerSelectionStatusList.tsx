
'use client';

import React from 'react';
import type { Player, PlayerCharacterSelection } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, UserCheck, UserX, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage as UIAvatarImage } from '@/components/ui/avatar';

const getInitials = (name: string) => {
  if (!name) return '';
  const names = name.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

interface PlayerSelectionStatusListProps {
  currentDay: number;
  characterSelectionStatus: {
    totalAdmittedPlayers: number;
    playersWhoSelectedForCurrentDay: number;
  };
  players: Player[];
  selectionsForCurrentDay: { [playerId: string]: PlayerCharacterSelection };
  isEmbedded?: boolean; // Optional prop to adjust styling if embedded
}

const PlayerSelectionStatusList: React.FC<PlayerSelectionStatusListProps> = ({
  currentDay,
  characterSelectionStatus,
  players,
  selectionsForCurrentDay,
  isEmbedded = false,
}) => {
  const cardClasses = isEmbedded
    ? "mt-6 border-primary/30 bg-transparent shadow-none border-none mb-0" // Minimal styling when embedded
    : "border-primary/30 bg-card shadow-parchment hunch-box mb-6"; // Full styling when standalone

  const headerPadding = isEmbedded ? "pb-3 pt-0" : "pb-3 pt-4";
  const contentPadding = isEmbedded ? "pt-0 pb-2" : "pt-0 pb-4";


  return (
    <Card className={cardClasses}>
      <CardHeader className={headerPadding}>
        <CardTitle className="text-md font-headline text-primary flex items-center">
          <ListChecks className="w-5 h-5 mr-2" />
          Player Selections for Day {currentDay}
        </CardTitle>
        <CardDescription className="text-xs font-body text-muted-foreground">
          {characterSelectionStatus.playersWhoSelectedForCurrentDay} / {characterSelectionStatus.totalAdmittedPlayers} players have chosen.
        </CardDescription>
      </CardHeader>
      <CardContent className={`${contentPadding} max-h-[30vh] md:max-h-48 overflow-y-auto`}>
        {players.length > 0 ? (
          <ul className="space-y-2">
            {players.map((player) => {
              const hasSelected = !!selectionsForCurrentDay[player.id];
              return (
                <li key={player.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-md text-sm">
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <UIAvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(player.screenName)}`} alt={player.screenName} data-ai-hint="avatar profile"/>
                      <AvatarFallback className="text-xs">{getInitials(player.screenName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-body font-medium">{player.screenName}</span>
                  </div>
                  {hasSelected ? (
                    <Badge variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <UserCheck className="mr-1 h-3 w-3" /> Chosen
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/50 text-destructive">
                      <UserX className="mr-1 h-3 w-3" /> Waiting...
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs font-body text-muted-foreground text-center">No players to display status for.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerSelectionStatusList;
