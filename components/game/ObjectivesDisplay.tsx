
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'; // Removed CardTitle
import { Heart, Trophy, Coins, Hourglass, ShieldQuestion } from 'lucide-react';

const ObjectivesDisplay: React.FC = () => {
  const objectives = [
    { id: 1, text: "Win 'lives' for the End Game.", icon: <Heart className="text-amber-700 fill-amber-700/70" /> },
    { id: 2, text: "Be the last one standing in the End Game to win the Jackpot!", icon: <Hourglass className="text-amber-700" /> }, // Using Hourglass for "last one standing"
    { id: 3, text: "Accumulate Daily Coins through smart hunches and round wins.", icon: <Coins className="text-amber-700" /> },
  ];

  return (
    <Card 
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <CardHeader className="p-3 text-center">
         <div className="inline-block mx-auto title-plaque">
           GAME OBJECTIVES
        </div>
        <CardDescription className="text-xs font-body text-muted-foreground mt-1 italic">
            Your path to riches and renown!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-2.5">
          {objectives.map(obj => (
            <li key={obj.id} className="flex items-start p-2.5 bg-black/5 rounded-md border border-border/70">
              <span className="mr-2.5 mt-0.5 h-5 w-5 shrink-0">{obj.icon}</span>
              <p className="text-sm font-body text-amber-800">{obj.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 p-3 bg-amber-600/10 rounded-md border border-amber-600/50 text-center shadow-inner-sm">
            <ShieldQuestion className="mx-auto h-7 w-7 text-amber-700 mb-1.5" />
            <p className="text-xs font-body font-medium text-amber-800 italic">Trust thy hunches, make bold predictions, and outwit thine adversaries!</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ObjectivesDisplay;
