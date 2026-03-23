'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { Game } from '@/lib/types';

export default function JoinGameByIdPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [screenName, setScreenName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [gameData, setGameData] = useState<Game | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchGameData = async () => {
      if (!db || !gameId) {
        toast({
          title: "Error",
          description: "Could not connect to database or game ID is missing.",
          variant: "destructive",
        });
        setIsLoadingGame(false);
        return;
      }

      try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);

        if (gameSnap.exists()) {
          const data = gameSnap.data() as Game;
          setGameData(data);
          
          if (data.status !== 'lobby') {
            toast({
              title: "Game Not Available",
              description: "This game is not accepting new players.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Game Not Found",
            description: "The game you're trying to join doesn't exist.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching game:", error);
        toast({
          title: "Error",
          description: "Could not load game information.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingGame(false);
      }
    };

    fetchGameData();
  }, [gameId, toast]);

  const handleJoinGame = async () => {
    const trimmedScreenName = screenName.trim();
    if (!trimmedScreenName) {
      toast({
        title: "Screen Name Required",
        description: "Please provide a screen name to join the lobby.",
        variant: "destructive",
      });
      return;
    }

    if (!gameData || gameData.status !== 'lobby') {
      toast({
        title: "Cannot Join",
        description: "This game is not accepting new players.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      router.push(`/lobby/${gameId}?screenName=${encodeURIComponent(trimmedScreenName)}`);
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Error",
        description: "Could not join the game. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isLoadingGame) {
    return (
      <PageLayout title="Loading...">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading game information...</p>
        </div>
      </PageLayout>
    );
  }

  if (!gameData || gameData.status !== 'lobby') {
    return (
      <PageLayout title="Game Not Available">
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <p className="text-muted-foreground text-center">
            This game is not available to join.
          </p>
          <Button onClick={() => router.push('/join-game')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby List
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Join Game">
      <div className="flex justify-center items-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary">
              Join: {gameData.gameName || 'Unnamed Lobby'}
            </CardTitle>
            <CardDescription>
              Enter your screen name to join this game lobby.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="screenName" className="flex items-center">
                <User className="mr-2 h-4 w-4" /> Your Screen Name
              </Label>
              <Input
                id="screenName"
                type="text"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                placeholder="e.g., BraveSirRobin"
                className="text-base"
                maxLength={20}
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleJoinGame}
                disabled={isLoading || !screenName.trim()}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Lobby
              </Button>
              <Button
                onClick={() => router.push('/join-game')}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lobby List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}





