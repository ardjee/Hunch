'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layout/PageLayout';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StartGameAutoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastActiveGameId = localStorage.getItem('lastActiveGameId');
      const lastPlayerId = localStorage.getItem('lastPlayerId');
      
      if (lastActiveGameId && lastPlayerId) {
        setGameId(lastActiveGameId);
        // Navigate to the start-game page with the game ID
        router.push(`/start-game/${lastActiveGameId}?playerId=${lastPlayerId}`);
      } else {
        setGameId(null);
      }
    }
  }, [router]);

  if (gameId === null && typeof window !== 'undefined') {
    return (
      <PageLayout title="Start Game" showLogo={false}>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-semibold text-destructive">No Active Game Found</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No active game ID was found in localStorage. Please navigate to a lobby page first, or provide the game ID manually.
          </p>
          <div className="flex gap-4 mt-4">
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Home
            </Button>
            <Button onClick={() => router.push('/join-game')} variant="default">
              Join a Game
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Starting Game..." showLogo={false}>
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Redirecting to start game...</p>
      </div>
    </PageLayout>
  );
}

