'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gem, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { CHARACTERS_LIST, DEFAULT_CHARACTER_ICON } from '@/lib/characters';

interface JackpotLogEntry {
  description: string;
  amount: number;
  icon?: string;
}

interface JackpotSummaryDisplayProps {
  currentDay: number;
  jackpotAmount: number;
  jackpotLog: JackpotLogEntry[];
  isCurrentUserGameMaster?: boolean;
  onProceedToNextStep?: () => Promise<void>;
}

const JackpotSummaryDisplay: React.FC<JackpotSummaryDisplayProps> = ({
  currentDay,
  jackpotAmount,
  jackpotLog,
  isCurrentUserGameMaster,
  onProceedToNextStep,
}) => {
  const totalChange = useMemo(() => {
    return jackpotLog.reduce((sum, entry) => sum + entry.amount, 0);
  }, [jackpotLog]);

  const startingAmount = jackpotAmount - totalChange;

  const getIconForEntry = (iconId?: string) => {
    if (!iconId) return Target;
    if (iconId === 'hunch') return Target;
    const character = CHARACTERS_LIST.find(c => c.id === iconId);
    return character?.icon || DEFAULT_CHARACTER_ICON;
  };

  return (
    <Card className="border-2 border-border/50 overflow-x-hidden">
      <CardHeader className="p-3 sm:p-4 text-center overflow-x-hidden">
        <div className="inline-block mx-auto title-plaque mb-2 text-sm sm:text-base">
          Day {currentDay} – STEP 7: Jackpot Summary
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-3 overflow-x-hidden">
        {/* Starting amount */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border">
          <span className="font-body text-sm text-muted-foreground">Starting Jackpot</span>
          <span className="font-headline text-lg font-bold text-foreground flex items-center gap-1">
            <Gem className="w-4 h-4 text-primary" />
            {startingAmount}
          </span>
        </div>

        {/* Log entries */}
        {jackpotLog.length > 0 ? (
          <div className="space-y-1.5">
            {jackpotLog.map((entry, index) => {
              const IconComponent = getIconForEntry(entry.icon);
              const isPositive = entry.amount > 0;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    isPositive
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span className="font-body text-xs sm:text-sm flex-1 text-foreground">
                    {entry.description}
                  </span>
                  <span className={`font-headline text-sm font-bold flex items-center gap-0.5 ${
                    isPositive ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{entry.amount}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center font-body text-sm text-muted-foreground py-4">
            No jackpot changes this day.
          </p>
        )}

        {/* Final amount */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 rounded-lg border-2 border-primary/50 shadow-lg">
          <span className="font-headline text-sm sm:text-base font-semibold text-primary">Final Jackpot</span>
          <span className="font-headline text-2xl sm:text-3xl font-bold text-primary flex items-center gap-1.5 drop-shadow-lg">
            <Gem className="w-5 h-5" />
            {jackpotAmount}
          </span>
        </div>

        {/* Net change */}
        {totalChange !== 0 && (
          <p className="text-center font-body text-xs text-muted-foreground">
            Net change: <strong className={totalChange > 0 ? 'text-green-700' : 'text-red-700'}>
              {totalChange > 0 ? '+' : ''}{totalChange} coins
            </strong>
          </p>
        )}

        {isCurrentUserGameMaster && onProceedToNextStep && (
          <Button
            onClick={onProceedToNextStep}
            className="w-full mt-2 font-headline text-lg"
            size="lg"
          >
            End Day & Advance
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default JackpotSummaryDisplay;
