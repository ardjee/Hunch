
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Users, LogIn, Loader2, ScrollText, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { Game, Player } from '@/lib/types';


interface RejoinInfo {
  gameId: string;
  gameName: string;
  screenName: string;
  playerId: string;
  gameStatus: 'lobby' | 'in-progress';
  isHost?: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [rejoinInfo, setRejoinInfo] = useState<RejoinInfo | null>(null);
  const [isLoadingRejoin, setIsLoadingRejoin] = useState(true);

  useEffect(() => {
    setIsLoadingRejoin(true);
    const storedGameId = localStorage.getItem('lastActiveGameId');
    const storedPlayerId = localStorage.getItem('lastPlayerId');
    const storedScreenName = localStorage.getItem('lastScreenName');

    if (storedGameId && storedPlayerId && storedScreenName && db) {
      const checkGameStatus = async () => {
        try {
          const gameRef = doc(db, 'games', storedGameId);
          const gameSnap = await getDoc(gameRef);
          if (gameSnap.exists()) {
            const game = gameSnap.data() as Game;
            if (game.status === 'lobby' || game.status === 'in-progress') {
              const playerRef = doc(db, 'games', storedGameId, 'players', storedPlayerId);
              const playerSnap = await getDoc(playerRef);
              if (playerSnap.exists()) {
                const player = playerSnap.data() as Player;
                const isAdmittedOrLobby = game.status === 'lobby' || (game.status === 'in-progress' && player.isAdmitted);
                
                if (isAdmittedOrLobby) {
                  setRejoinInfo({
                    gameId: storedGameId,
                    gameName: game.gameName || `A Game Most Mysterious (ID: ${storedGameId.substring(0,6)})`,
                    screenName: storedScreenName,
                    playerId: storedPlayerId,
                    gameStatus: game.status,
                    isHost: game.status === 'lobby' && player.id === game.gameMasterId,
                  });
                } else {
                  localStorage.removeItem('lastActiveGameId');
                  localStorage.removeItem('lastPlayerId');
                  localStorage.removeItem('lastScreenName');
                }
              } else { 
                localStorage.removeItem('lastActiveGameId');
                localStorage.removeItem('lastPlayerId');
                localStorage.removeItem('lastScreenName');
              }
            } else { 
              localStorage.removeItem('lastActiveGameId');
              localStorage.removeItem('lastPlayerId');
              localStorage.removeItem('lastScreenName');
            }
          } else { 
            localStorage.removeItem('lastActiveGameId');
            localStorage.removeItem('lastPlayerId');
            localStorage.removeItem('lastScreenName');
          }
        } catch (error) {
          console.error("Error checking rejoin status:", error);
          localStorage.removeItem('lastActiveGameId');
          localStorage.removeItem('lastPlayerId');
          localStorage.removeItem('lastScreenName');
        } finally {
          setIsLoadingRejoin(false);
        }
      };
      checkGameStatus();
    } else {
      setIsLoadingRejoin(false);
    }
  }, []);

  const handleRejoin = () => {
    if (!rejoinInfo) return;
    let targetPath = rejoinInfo.gameStatus === 'lobby' ? `/lobby/${rejoinInfo.gameId}` : `/game/${rejoinInfo.gameId}`;
    let queryParams = `?screenName=${encodeURIComponent(rejoinInfo.screenName)}&playerId=${rejoinInfo.playerId}`;
    if (rejoinInfo.isHost) {
      queryParams += '&isHost=true';
    }
    router.push(targetPath + queryParams);
  };

  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center">
        {isLoadingRejoin && (
          <div className="text-center text-muted-foreground mb-6 p-4 flex items-center justify-center font-body">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Seeking active quests...
          </div>
        )}
        {!isLoadingRejoin && rejoinInfo && (
          <Card className="hunch-box w-full"> {/* Applied hunch-box, removed other conflicting classes */}
            <CardHeader className="text-center p-4">
              <CardTitle className="text-2xl font-headline text-primary">Welcome Back, {rejoinInfo.screenName}!</CardTitle>
              <CardDescription className="text-sm text-muted-foreground pt-1 font-body">
                Thy previous adventure awaits: <strong className="text-primary/90">{rejoinInfo.gameName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Button
                variant="default"
                size="lg"
                className="w-full hunch-glow bg-primary hover:bg-primary/90 text-primary-foreground font-headline text-base tracking-wider"
                onClick={handleRejoin}
              >
                <LogIn className="mr-2 h-5 w-5" /> Rejoin Quest
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="hunch-box w-full"> {/* Applied hunch-box, removed other conflicting classes */}
          <CardHeader className="text-center p-4 pt-6">
            <CardTitle className="text-3xl font-headline text-sepia-dark">Welcome Traveler!</CardTitle>
            <CardDescription className="text-base text-muted-foreground pt-2 font-body">
              A game of intuition, strategy, and a sprinkle of fortune.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4 p-6">
            <Link href="/create-game" passHref>
              <Button variant="default" size="lg" className="w-full hunch-glow bg-accent hover:bg-accent/90 text-accent-foreground font-headline text-base tracking-wider">
                <Sparkles className="mr-2 h-5 w-5" /> Forge New Quest
              </Button>
            </Link>
            <Link href="/join-game" passHref>
              <Button variant="outline" size="lg" className="w-full border-border hover:bg-muted/50 text-foreground font-headline text-base tracking-wider">
                <Users className="mr-2 h-5 w-5" /> Join Existing Quest
              </Button>
            </Link>
            <Link href="/mini-games" passHref target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="w-full border-border hover:bg-muted/50 text-foreground font-headline text-base tracking-wider">
                <Swords className="mr-2 h-5 w-5" /> End Game Arena
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="hunch-box w-full"> {/* Applied hunch-box, removed other conflicting classes */}
          <CardHeader className="p-4">
            <CardTitle className="text-xl font-headline text-sepia-dark flex items-center">
              <ScrollText className="mr-2 h-5 w-5 text-primary" />
              The Rules of Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 font-body text-sm pb-4 px-4">
            <p><strong>1. Gather Thy Companions:</strong> One player begins the tale, others may join.</p>
            <p><strong>2. Appoint a Game Master:</strong> They shall guide the quest (and may partake!).</p>
            <p><strong>3. Journey Through a Set Number of Days:</strong> Each day holds trials of hunches and character plays.</p>
            <p><strong>4. Seek Thy Objectives:</strong> Win 'lives' for the grand End Game, gather daily coins, and claim the coveted Jackpot!</p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
