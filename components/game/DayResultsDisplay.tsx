
'use client';

import type { Game } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, ShieldCheck, Crown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React, { useMemo } from 'react';

interface DayResultsDisplayProps {
  results: NonNullable<Game['currentDayResults']>;
  currentDay: number;
  isCurrentUserGameMaster?: boolean;
  onProceedToNextStep?: () => Promise<void>;
}

type PlayerHunchResult = NonNullable<Game['currentDayResults']>['playerHunches'][0];

const DayResultsDisplay: React.FC<DayResultsDisplayProps> = ({ results, currentDay, isCurrentUserGameMaster, onProceedToNextStep }) => {
  const sortedPlayerResults = useMemo(() => {
    if (!results?.playerHunches) return [];
    return [...results.playerHunches].sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;

      const aDiff = a.difference ?? Infinity;
      const bDiff = b.difference ?? Infinity;
      return aDiff - bDiff;
    });
  }, [results?.playerHunches]);

  if (!results || !results.playerHunches) {
    return (
      <Card className="border-2 border-border/50">
        <CardHeader className="p-3 text-center">
          <div className="inline-block mx-auto title-plaque">
            RESULTS NOT AVAILABLE
          </div>
        </CardHeader>
        <CardContent className="p-4 font-body text-center text-muted-foreground">
          <p>The results for Day {currentDay} have not been revealed yet or are unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  const actualBestPlayerId =
    sortedPlayerResults.length > 0 &&
    sortedPlayerResults[0].difference !== null &&
    !sortedPlayerResults[0].isDisqualified
      ? sortedPlayerResults[0].playerId
      : null;

  return (
    <Card className="border-2 border-border/50">
      <CardHeader className="p-3 text-center">
        <div className="inline-block mx-auto title-plaque mb-2">
          Day {currentDay} RESULTS (STEP 5)
        </div>
        <CardDescription className="text-base font-body text-foreground flex items-center justify-center">
          <Flame className="w-5 h-5 mr-2 text-primary" />
          Actual Result for the Challenge: <strong className="ml-1 text-accent font-bold">{results.actualResult}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="max-h-[50vh] md:h-[350px] pr-2">
          {sortedPlayerResults.length === 0 && (
            <p className="font-body text-muted-foreground text-center py-4">No hunches were submitted.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sortedPlayerResults.map((playerResult, displayIndex) => {
              const isActualBestPlayer = playerResult.playerId === actualBestPlayerId;
              return (
                <div
                  key={playerResult.playerId}
                  className={`p-2 rounded-md border flex items-center justify-between
                    ${playerResult.isDisqualified ? 'bg-destructive/10 border-destructive/40 opacity-80' : 
                      isActualBestPlayer && playerResult.difference === 0 && !playerResult.isDisqualified ? 'bg-primary/10 border-primary/50 shadow-md ring-1 ring-primary/30' : 
                      isActualBestPlayer && !playerResult.isDisqualified ? 'bg-primary/10 border-primary/40 shadow-sm' :
                      'bg-card border-border'
                    }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-headline text-foreground">
                      {displayIndex + 1}. {playerResult.screenName}
                    </span>
                    {isActualBestPlayer && !playerResult.isDisqualified && (
                       playerResult.difference === 0 ? 
                       <Badge variant="default" className="bg-yellow-500 text-yellow-900 border-yellow-700 text-xs">
                         <Crown className="w-3 h-3 mr-1"/> Exact Hunch!
                       </Badge> :
                       <Badge variant="outline" className="border-primary text-primary bg-primary/20 text-xs">
                         <ShieldCheck className="w-3 h-3 mr-1"/> Closest
                       </Badge>
                    )}
                    {playerResult.isDisqualified && (
                        <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Disqualified</Badge>
                    )}
                    <span className="text-xs font-body text-muted-foreground">
                      Hunch: <strong className="text-foreground">{playerResult.originalHunch || 'N/A'}</strong>
                      {playerResult.isTricksterAdjusted && playerResult.originalHunch !== playerResult.displayedHunch && playerResult.displayedHunch && playerResult.displayedHunch !== "DISQUALIFIED" && (
                        <span className="ml-1 text-primary italic">(Adjusted: <strong className="text-primary">{playerResult.displayedHunch.split('Adjusted: ')[1]?.replace(')','')}</strong>)</span>
                      )}
                    </span>
                  </div>
                  {!playerResult.isDisqualified && playerResult.difference !== null && playerResult.difference !== Infinity && (
                    <span className="text-xs font-body text-muted-foreground ml-2 whitespace-nowrap">
                      Off by: <strong className="text-foreground">{playerResult.difference.toFixed(0)}</strong>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {isCurrentUserGameMaster && onProceedToNextStep && (
          <Button
            onClick={onProceedToNextStep}
            className="w-full mt-4 font-headline text-lg"
            size="lg"
          >
            Proceed to Voting (Step 6)
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DayResultsDisplay;
