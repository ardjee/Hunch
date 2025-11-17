
'use client';

import type { Game } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, ShieldCheck, Crown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import React, { useMemo } from 'react';

interface DayResultsDisplayProps {
  results: NonNullable<Game['currentDayResults']>;
  currentDay: number;
}

type PlayerHunchResult = NonNullable<Game['currentDayResults']>['playerHunches'][0];

const DayResultsDisplay: React.FC<DayResultsDisplayProps> = ({ results, currentDay }) => {
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
      <Card className="bg-card border-2 border-border shadow-parchment">
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
    <Card className="bg-card border-2 border-border shadow-parchment mb-6">
      <CardHeader className="p-3 text-center">
        <div className="inline-block mx-auto title-plaque mb-3">
          Day {currentDay} RESULTS (STEP 5)
        </div>
        <CardDescription className="text-base font-body text-foreground flex items-center justify-center">
          <Flame className="w-5 h-5 mr-2 text-primary" />
          Actual Result for the Challenge: <strong className="ml-1 text-accent font-bold">{results.actualResult}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="max-h-[60vh] md:h-[350px] pr-2">
          {sortedPlayerResults.length === 0 && (
            <p className="font-body text-muted-foreground text-center py-4">No hunches were submitted.</p>
          )}
          <ul className="space-y-3">
            {sortedPlayerResults.map((playerResult, displayIndex) => {
              const isActualBestPlayer = playerResult.playerId === actualBestPlayerId;
              return (
                <li
                  key={playerResult.playerId}
                  className={`p-3 rounded-md border-2 flex flex-col 
                    ${playerResult.isDisqualified ? 'bg-destructive/10 border-destructive/40 opacity-80' : 
                      isActualBestPlayer && playerResult.difference === 0 && !playerResult.isDisqualified ? 'bg-primary/10 border-primary/50 shadow-md ring-1 ring-primary/30' : 
                      isActualBestPlayer && !playerResult.isDisqualified ? 'bg-primary/10 border-primary/40 shadow-sm' :
                      'bg-card border-border'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-lg font-headline text-foreground mr-2">
                        {displayIndex + 1}. {playerResult.screenName}
                      </span>
                      {isActualBestPlayer && !playerResult.isDisqualified && (
                         playerResult.difference === 0 ? 
                         <Badge variant="default" className="bg-yellow-500 text-yellow-900 border-yellow-700">
                           <Crown className="w-3 h-3 mr-1"/> Exact Hunch!
                         </Badge> :
                         <Badge variant="outline" className="border-primary text-primary bg-primary/20">
                           <ShieldCheck className="w-3 h-3 mr-1"/> Closest
                         </Badge>
                      )}
                    </div>
                    {playerResult.isDisqualified && (
                        <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Disqualified</Badge>
                    )}
                  </div>
                  
                  {isActualBestPlayer && playerResult.difference !== null && !playerResult.isDisqualified && (
                       <p className="text-xs font-body text-muted-foreground mb-1 italic">
                         {playerResult.difference === 0 ? "A perfect prediction!" : "The most insightful hunch!"}
                       </p>
                  )}

                  <div className="w-full h-px bg-border my-1.5"></div>

                  <div className="flex justify-between items-baseline">
                      <p className="text-sm font-body text-muted-foreground">
                          Hunch: <strong className="text-foreground text-base">{playerResult.originalHunch || 'N/A'}</strong>
                          {playerResult.isTricksterAdjusted && playerResult.originalHunch !== playerResult.displayedHunch && playerResult.displayedHunch && playerResult.displayedHunch !== "DISQUALIFIED" && (
                          <span className="text-xs ml-1 text-primary italic">(Adjusted: <strong className="text-primary">{playerResult.displayedHunch.split('Adjusted: ')[1]?.replace(')','')}</strong>)</span>
                          )}
                      </p>
                      {!playerResult.isDisqualified && playerResult.difference !== null && playerResult.difference !== Infinity && (
                      <p className="text-sm font-body text-muted-foreground">
                          Off by: <strong className="text-foreground text-base">{playerResult.difference.toFixed(0)}</strong>
                      </p>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DayResultsDisplay;
