'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layout/PageLayout';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { Game, Player } from '@/lib/types';

export default function StartGamePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const gameId = params.gameId as string;
  const playerId = searchParams.get('playerId') || (typeof window !== 'undefined' ? localStorage.getItem('lastPlayerId') : null);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const startGame = async () => {
      if (!gameId || !playerId) {
        setStatus('error');
        setMessage('Missing game ID or player ID');
        toast({
          title: 'Error',
          description: 'Game ID or player ID not found. Please provide them in the URL or localStorage.',
          variant: 'destructive',
        });
        return;
      }

      if (!db) {
        setStatus('error');
        setMessage('Firebase database not initialized');
        toast({
          title: 'Database Error',
          description: 'Firebase is not available. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      try {
        // Get game data
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);
        
        if (!gameDoc.exists()) {
          setStatus('error');
          setMessage('Game not found');
          toast({
            title: 'Game Not Found',
            description: 'The game does not exist.',
            variant: 'destructive',
          });
          return;
        }

        const gameData = gameDoc.data() as Game;

        // Verify the player is the game master
        if (gameData.gameMasterId !== playerId) {
          setStatus('error');
          setMessage('Only the Game Master can start the game');
          toast({
            title: 'Permission Denied',
            description: 'Only the Game Master can start the game.',
            variant: 'destructive',
          });
          
          // Redirect to lobby after a delay
          setTimeout(() => {
            router.push(`/lobby/${gameId}?playerId=${playerId}`);
          }, 3000);
          return;
        }

        // Check game status
        if (gameData.status !== 'lobby') {
          setStatus('error');
          setMessage(`Game is already ${gameData.status}`);
          toast({
            title: 'Game Already Started',
            description: `The game is already ${gameData.status}.`,
            variant: 'destructive',
          });
          
          // Redirect to appropriate page
          if (gameData.status === 'in-progress') {
            setTimeout(() => {
              router.push(`/game/${gameId}?playerId=${playerId}`);
            }, 2000);
          } else {
            setTimeout(() => {
              router.push(`/lobby/${gameId}?playerId=${playerId}`);
            }, 2000);
          }
          return;
        }

        // Get admitted players
        const playersQuery = query(
          collection(db, 'games', gameId, 'players'),
          where('isAdmitted', '==', true)
        );
        const playersSnapshot = await getDocs(playersQuery);
        const admittedPlayers = playersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Player));

        if (admittedPlayers.length < 1) {
          setStatus('error');
          setMessage('At least one admitted player is needed');
          toast({
            title: 'Not Enough Players',
            description: 'At least one admitted player (the Game Master) is needed to start.',
            variant: 'destructive',
          });
          
          setTimeout(() => {
            router.push(`/lobby/${gameId}?playerId=${playerId}`);
          }, 3000);
          return;
        }

        // Start the game
        await updateDoc(gameDocRef, {
          status: 'in-progress',
          currentDay: 1,
          currentDayStep: 1,
        });

        setStatus('success');
        setMessage('Game started successfully!');
        toast({
          title: 'Game Started!',
          description: 'Redirecting to game page...',
        });

        // Redirect to game page after a short delay
        setTimeout(() => {
          router.push(`/game/${gameId}?playerId=${playerId}`);
        }, 2000);

      } catch (error: any) {
        console.error('Error starting game:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to start game');
        toast({
          title: 'Error Starting Game',
          description: error.message || 'Could not start the game. Please try again.',
          variant: 'destructive',
        });
        
        setTimeout(() => {
          router.push(`/lobby/${gameId}?playerId=${playerId || ''}`);
        }, 3000);
      }
    };

    startGame();
  }, [gameId, playerId, router, toast]);

  return (
    <PageLayout title="Starting Game..." showLogo={false}>
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Starting game...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-600">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to game page...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-semibold text-destructive">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting back to lobby...</p>
          </>
        )}
      </div>
    </PageLayout>
  );
}

