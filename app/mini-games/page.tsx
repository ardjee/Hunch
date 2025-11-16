
'use client';

import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords, Music, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MiniGamesPage() {

  const miniGames = [
    { title: 'In Tune (Spotify)', isLink: true, href: '/mini-games/in-tune', icon: Music },
    { title: 'Storage Connection Test', isLink: true, href: '/mini-games/storage-test', icon: Shield },
    { title: "The King's Decree" },
    { title: "Alchemist's Riddle" },
    { title: "Jester's Gamble" },
    { title: 'The Final Stand' },
  ];

  return (
    <PageLayout title="End Game Arena">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl hunch-box">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary flex items-center">
              <Swords className="mr-3 h-6 w-6" />
              End Game & Diagnostics
            </CardTitle>
            <CardDescription>
              This is the arena for final trials and diagnostic tools. The "In Tune" game requires a connection to the Spotify API. The "Storage Connection Test" verifies access to Firebase Storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 font-body">
              {miniGames.map((game, index) => (
                <li key={index} className="p-4 rounded-md border flex items-center justify-between bg-muted/30">
                  <span className="font-semibold text-lg text-foreground">{game.title}</span>
                  {game.isLink && game.href ? (
                     <Link href={game.href} target="_blank" rel="noopener noreferrer">
                        <Button variant="default">
                          {game.icon && <game.icon className="mr-2 h-4 w-4" />} Play
                        </Button>
                      </Link>
                  ) : (
                    <Button variant="outline" disabled>Coming Soon</Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
