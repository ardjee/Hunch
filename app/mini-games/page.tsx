
'use client';

import PageLayout from '@/components/layout/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Swords, Music, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MiniGamesPage() {
  const router = useRouter();

  const availableGames = [
    { title: 'In Tune (Spotify)', href: '/mini-games/in-tune', icon: Music },
    { title: 'Storage Connection Test', href: '/mini-games/storage-test', icon: Shield },
  ];

  const comingSoonGames = [
    "The King's Decree",
    "Alchemist's Riddle",
    "Jester's Gamble",
    'The Final Stand',
  ];

  return (
    <PageLayout title="End Game Arena">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl hunch-box">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-headline text-primary flex items-center">
              <Swords className="mr-3 h-6 w-6" />
              End Game Arena
            </CardTitle>
            <CardDescription className="text-xs">
              Final trials and diagnostic tools for The Hunch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {/* Available games */}
            <div className="space-y-2">
              {availableGames.map((game) => (
                <div key={game.title} className="p-3 rounded-md border flex items-center justify-between bg-muted/30">
                  <span className="font-semibold text-base text-foreground">{game.title}</span>
                  <Link href={game.href} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="hunch-glow">
                      {game.icon && <game.icon className="mr-2 h-4 w-4" />} Play
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Coming soon group */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Coming Soon</p>
              <div className="space-y-2">
                {comingSoonGames.map((title) => (
                  <div key={title} className="p-3 rounded-md border flex items-center justify-between bg-muted/20 opacity-60">
                    <span className="font-semibold text-base text-foreground">{title}</span>
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">Soon</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageLayout>
  );
}
