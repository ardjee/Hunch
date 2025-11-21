'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DiceRollProps {
  diceRoll: number;
  cost: number;
  playerName?: string;
  size?: 'single' | 'overview';
}

const DiceRoll: React.FC<DiceRollProps> = ({ diceRoll, cost, playerName, size = 'single' }) => {
  const [isRolling, setIsRolling] = useState(true);
  const [displayValue, setDisplayValue] = useState(1);

  useEffect(() => {
    // Animate dice rolling
    const rollDuration = 1500; // 1.5 seconds
    const interval = 50; // Update every 50ms
    const steps = rollDuration / interval;
    let currentStep = 0;

    const rollInterval = setInterval(() => {
      currentStep++;
      // Show random values during rolling
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
      
      if (currentStep >= steps) {
        clearInterval(rollInterval);
        setDisplayValue(diceRoll);
        setIsRolling(false);
      }
    }, interval);

    return () => clearInterval(rollInterval);
  }, [diceRoll]);

  if (size === 'overview') {
    return (
      <div className="flex flex-col items-center h-full p-4 border-2 border-border rounded-lg bg-muted/30 min-h-[140px]">
        {playerName && (
          <div className="text-sm font-semibold text-foreground text-center mb-4 break-words">{playerName}</div>
        )}
        <div className="flex flex-col items-center space-y-2 mt-auto">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className={cn(
              "text-3xl font-bold transition-all duration-300",
              isRolling ? "text-primary animate-pulse" : "text-foreground"
            )}>
              {displayValue}
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {isRolling ? '...' : `-${cost} coins`}
          </div>
        </div>
      </div>
    );
  }

  // Single magician view - large display
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8">
      <div className="text-lg font-semibold text-foreground mb-4">
        {playerName ? `${playerName} rolled:` : 'Dice Roll:'}
      </div>
      
      {/* Vertical dice display */}
      <div className="relative w-32 h-32 flex items-center justify-center border-4 border-primary rounded-lg bg-muted/50 shadow-lg">
        <div className={cn(
          "text-7xl font-bold transition-all duration-300",
          isRolling ? "text-primary animate-pulse" : "text-foreground"
        )}>
          {displayValue}
        </div>
      </div>
      
      {/* Cost display in large red number */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-muted-foreground mb-2">
          Payment to Jackpot:
        </div>
        <div className={cn(
          "text-6xl font-bold transition-all duration-300",
          isRolling ? "text-red-400 animate-pulse" : "text-red-600"
        )}>
          {isRolling ? '...' : cost}
        </div>
        <div className="text-lg font-medium text-muted-foreground mt-2">
          coins
        </div>
      </div>
    </div>
  );
};

export default DiceRoll;

