'use client';

import React, { useMemo } from 'react';
import type { Player } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Users, Target, CheckCircle2, MinusCircle, Trophy, Medal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoteSummaryDisplayProps {
  votes?: Record<string, string>;
  players: Player[];
  currentDay: number;
  actualResult?: string | null;
  currentDayResults?: {
    playerHunches: Array<{
      playerId: string;
      screenName: string;
      originalHunch: string;
      displayedHunch: string;
      difference: number | null;
      isDisqualified: boolean;
    }>;
  } | null;
  isCurrentUserGameMaster?: boolean;
  onProceedToNextStep?: () => Promise<void>;
}

const VoteSummaryDisplay: React.FC<VoteSummaryDisplayProps> = ({
  votes = {},
  players,
  currentDay,
  actualResult,
  currentDayResults,
  isCurrentUserGameMaster,
  onProceedToNextStep,
}) => {
  const playerLookup = useMemo(() => {
    const lookup = new Map<string, Player>();
    players.forEach((player) => lookup.set(player.id, player));
    return lookup;
  }, [players]);

  const voteTotals = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(votes).forEach((targetId) => {
      if (!targetId) return;
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([targetId, count]) => ({
        targetId,
        count,
        name: playerLookup.get(targetId)?.screenName || 'Unknown Player',
      }))
      .sort((a, b) => {
        if (b.count === a.count) {
          return a.name.localeCompare(b.name);
        }
        return b.count - a.count;
      });
  }, [votes, playerLookup]);

  const individualVotes = useMemo(() => {
    return players.map((player) => {
      const targetId = votes?.[player.id];
      return {
        voterId: player.id,
        voterName: player.screenName,
        targetId,
        targetName: targetId
          ? playerLookup.get(targetId)?.screenName || 'Unknown Player'
          : null,
      };
    });
  }, [players, votes, playerLookup]);

  const topVoteCount = voteTotals.length > 0 ? voteTotals[0].count : 0;
  const totalVotesRecorded = Object.keys(votes || {}).length;
  const playersWithoutVotes = individualVotes.filter((entry) => !entry.targetId);
  
  // Find the closest guess
  const closestGuess = useMemo(() => {
    if (!currentDayResults?.playerHunches) return null;
    const validHunches = currentDayResults.playerHunches.filter(
      h => !h.isDisqualified && h.difference !== null && h.difference !== Infinity
    );
    if (validHunches.length === 0) return null;
    
    // Sort by difference (closest first) and get the first one
    const sorted = [...validHunches].sort((a, b) => {
      const diffA = a.difference ?? Infinity;
      const diffB = b.difference ?? Infinity;
      return diffA - diffB;
    });
    return sorted[0];
  }, [currentDayResults]);
  
  // Get top 3 for podium
  const topThree = voteTotals.slice(0, 3);
  const firstPlace = topThree[0];
  const secondPlace = topThree[1];
  const thirdPlace = topThree[2];

  return (
    <Card className="border-2 border-border/50 overflow-x-hidden">
      <CardHeader className="p-3 sm:p-4 text-center overflow-x-hidden">
        <div className="inline-block mx-auto title-plaque mb-2 text-sm sm:text-base">
          Day {currentDay} – STEP 6: Vote Summary
        </div>
        <CardDescription className="text-sm sm:text-base font-body text-foreground flex flex-col items-center gap-1">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Who everyone believed had the closest hunch.
          </span>
        </CardDescription>
        
        {/* Actual Result - Compact display */}
        {actualResult && (
          <div className="relative mt-2 mb-1 px-4 py-2 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 rounded-lg border-2 border-primary/50 shadow-lg overflow-hidden max-w-full">
            <div className="relative z-10 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                Actual Challenge Result
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              </div>
              <div className="text-2xl sm:text-3xl font-headline font-bold text-primary drop-shadow-lg" style={{
                textShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
                letterSpacing: '0.05em',
              }}>
                {actualResult}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-x-hidden">
        <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
          <section className="space-y-2 min-w-0 overflow-x-hidden">
            {/* Closest Guess Display */}
            {closestGuess && (
              <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-headline text-primary font-semibold text-sm">Closest Guess</span>
                </div>
                <p className="font-body text-xs text-foreground break-words mt-1">
                  <strong className="text-primary">{closestGuess.screenName}</strong> had the closest hunch: <strong className="text-foreground">"{closestGuess.originalHunch}"</strong>
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-primary font-headline text-sm sm:text-base">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              Vote Totals
            </div>
            {voteTotals.length === 0 ? (
              <p className="font-body text-xs sm:text-sm text-muted-foreground">
                No votes were submitted for this challenge.
              </p>
            ) : (
              <div className="w-full overflow-x-hidden">
                {/* Podium Display */}
                {topThree.length > 0 && (
                  <div className="relative w-full flex items-end justify-center gap-1 mb-2 min-h-[80px] sm:min-h-[100px] px-1 overflow-x-auto">
                    {/* 2nd Place - Left */}
                    {secondPlace && (
                      <div className="flex-1 flex flex-col items-center max-w-[100px] sm:max-w-[120px] min-w-[70px]">
                        <div className="w-full bg-gradient-to-b from-gray-200 to-gray-400 border-2 border-gray-600 rounded-t-lg shadow-lg flex flex-col items-center justify-end pb-1.5 pt-1" style={{ height: '65px' }}>
                          <Medal className="w-4 h-4 text-gray-700 mb-0.5 flex-shrink-0" />
                          <p className="font-headline text-foreground text-[10px] font-bold px-1 text-center truncate w-full">{secondPlace.name}</p>
                          <div className="bg-gray-600 text-gray-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                            {secondPlace.count} {secondPlace.count === 1 ? 'vote' : 'votes'}
                          </div>
                          <div className="text-[9px] text-gray-800 font-semibold mt-0.5">2nd Place</div>
                        </div>
                      </div>
                    )}

                    {/* 1st Place - Middle (tallest) */}
                    {firstPlace && (
                      <div className="flex-1 flex flex-col items-center max-w-[100px] sm:max-w-[120px] min-w-[70px]">
                        <div className="w-full bg-gradient-to-b from-yellow-200 to-yellow-400 border-2 border-yellow-600 rounded-t-lg shadow-lg flex flex-col items-center justify-end pb-1.5 pt-1" style={{ height: '85px' }}>
                          <Trophy className="w-5 h-5 text-yellow-700 mb-0.5 flex-shrink-0" />
                          <p className="font-headline text-foreground text-[10px] font-bold px-1 text-center truncate w-full">{firstPlace.name}</p>
                          <div className="bg-yellow-600 text-yellow-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                            {firstPlace.count} {firstPlace.count === 1 ? 'vote' : 'votes'}
                          </div>
                          <div className="text-[9px] text-yellow-800 font-semibold mt-0.5">1st Place</div>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place - Right */}
                    {thirdPlace && (
                      <div className="flex-1 flex flex-col items-center max-w-[100px] sm:max-w-[120px] min-w-[70px]">
                        <div className="w-full bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-amber-700 rounded-t-lg shadow-lg flex flex-col items-center justify-end pb-1.5 pt-1" style={{ height: '55px' }}>
                          <Medal className="w-4 h-4 text-amber-800 mb-0.5 flex-shrink-0" />
                          <p className="font-headline text-foreground text-[10px] font-bold px-1 text-center truncate w-full">{thirdPlace.name}</p>
                          <div className="bg-amber-700 text-amber-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                            {thirdPlace.count} {thirdPlace.count === 1 ? 'vote' : 'votes'}
                          </div>
                          <div className="text-[9px] text-amber-900 font-semibold mt-0.5">3rd Place</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Other Results Accordion */}
            {voteTotals.length > 3 && (
              <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="other-results" className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>Other Results</span>
                      <Badge variant="secondary" className="ml-2">
                        {voteTotals.length - 3}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pt-2">
                      {voteTotals.slice(3).map((entry) => (
                        <li
                          key={entry.targetId}
                          className="p-2 rounded-md border border-border flex items-center justify-between bg-muted/20"
                        >
                          <p className="font-headline text-foreground text-sm">{entry.name}</p>
                          <Badge variant="secondary" className="text-sm px-2">
                            {entry.count} {entry.count === 1 ? 'vote' : 'votes'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </section>

          <section className="space-y-2 min-w-0 overflow-x-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="individual-votes" className="border border-border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-primary font-headline text-sm sm:text-base">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    Individual Votes
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] pr-1 overflow-y-auto overflow-x-hidden pt-4">
                    {individualVotes.map((entry) => {
                      // Determine the "right player" - the one with the closest hunch (best accuracy)
                      let rightPlayerId: string | null = null;
                      if (currentDayResults?.playerHunches) {
                        const validHunches = currentDayResults.playerHunches.filter(
                          h => !h.isDisqualified && h.difference !== null && h.difference !== Infinity
                        );
                        if (validHunches.length > 0) {
                          // Sort by difference (closest first) and get the first one
                          const sorted = [...validHunches].sort((a, b) => {
                            const diffA = a.difference ?? Infinity;
                            const diffB = b.difference ?? Infinity;
                            return diffA - diffB;
                          });
                          rightPlayerId = sorted[0].playerId;
                        }
                      }
                      
                      // Fallback to vote winner if we don't have hunch results
                      if (!rightPlayerId && voteTotals.length > 0) {
                        rightPlayerId = voteTotals[0].targetId;
                      }
                      
                      const isCorrectVote = entry.targetId === rightPlayerId;
                      const hasVoted = !!entry.targetId;
                      
                      // Apply green tint for correct votes, red tint for incorrect votes
                      const bgColorClass = hasVoted 
                        ? (isCorrectVote 
                            ? 'bg-green-500/20 border-green-500/50' 
                            : 'bg-red-500/20 border-red-500/50')
                        : 'bg-muted/30 border-border';
                      
                      return (
                        <div
                          key={entry.voterId}
                          className={`p-2 rounded-md border ${bgColorClass} flex flex-col gap-1`}
                        >
                          <span className="font-headline text-foreground text-sm">{entry.voterName}</span>
                          {entry.targetName ? (
                            <span className="font-body text-xs text-primary">
                              voted for <strong className="text-foreground">{entry.targetName}</strong>
                            </span>
                          ) : (
                            <span className="font-body text-xs text-destructive flex items-center gap-1">
                              <MinusCircle className="w-3 h-3" /> No vote
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>

        <div className="text-xs text-muted-foreground font-body border-t border-border pt-2 flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 sm:justify-between">
          <span className="break-words">Total votes recorded: <strong className="text-foreground">{totalVotesRecorded}</strong></span>
          {playersWithoutVotes.length > 0 && (
            <span className="text-destructive break-words">
              Missing votes: {playersWithoutVotes.map((entry) => entry.voterName).join(', ')}
            </span>
          )}
        </div>
        {isCurrentUserGameMaster && onProceedToNextStep && (
          <Button
            onClick={onProceedToNextStep}
            className="w-full mt-2 font-headline text-lg"
            size="lg"
          >
            View Jackpot Summary
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default VoteSummaryDisplay;

