
'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface GameDayTrackerProps {
  currentDay: number;
  displayRoundNumber: number;
  totalGameDays: number;
}

const GameDayTracker: React.FC<GameDayTrackerProps> = ({ currentDay, displayRoundNumber, totalGameDays }) => {
  const safeCurrentDay = Math.max(1, currentDay || 1);
  const safeTotalGameDays = Math.max(1, totalGameDays || 1);
  const safeDisplayRoundNumber = Math.max(1, displayRoundNumber || 1);
  const roundsPerDay = 5; // Fixed number of phases per day

  return (
    <Card className="hunch-box">
      <CardHeader className="p-3 text-center">
        <div className="inline-block mx-auto title-plaque text-amber-700">
          GAME PROGRESS
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-4 pt-2">
        {/* Day Slider */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="font-headline text-amber-700 text-lg">Day Progress</span>
          </div>
          <Slider
            value={[safeCurrentDay]}
            max={safeTotalGameDays}
            min={1}
            step={1}
            disabled={true}
            aria-label={`Game Day Progress: Day ${safeCurrentDay} of ${safeTotalGameDays}`}
          />
          <div className="text-center text-xs font-body text-amber-700 mt-1">
            <span>Day {safeCurrentDay} of {safeTotalGameDays}</span>
          </div>
        </div>

        {/* Step Slider */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="font-headline text-amber-700 text-lg">Daily Phase</span>
          </div>
          <Slider
            value={[safeDisplayRoundNumber]}
            max={roundsPerDay}
            min={1}
            step={1}
            disabled={true}
            aria-label={`Daily Phase Progress: Step ${safeDisplayRoundNumber} of ${roundsPerDay}`}
          />
          <div className="text-center text-xs font-body text-amber-700 mt-1">
            <span>Phase {safeDisplayRoundNumber} of {roundsPerDay}</span>
          </div>
        </div>

        {safeCurrentDay >= safeTotalGameDays && safeDisplayRoundNumber >= roundsPerDay && (
            <p className="text-center font-body font-semibold text-primary pt-2 text-sm">The game has concluded!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default GameDayTracker;
