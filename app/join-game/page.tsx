
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User, LogIn, ListChecks, Loader2, Server, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import type { Game } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';


interface ActiveGame extends Game {
  id: string;
}

export default function JoinGamePage() {
  const [screenName, setScreenName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isDeletingAllLobbies, setIsDeletingAllLobbies] = useState(false);
  const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      console.error("JoinGamePage: Firestore 'db' instance is not available.");
      toast({
        title: "Database Connection Error",
        description: "Could not connect to Firestore. Active game lobbies cannot be loaded. Please check your internet connection and Firebase setup.",
        variant: "destructive",
      });
      setIsLoadingGames(false);
      return;
    }
    console.log("JoinGamePage: Attempting to fetch active lobbies from Firestore.");

    const q = query(
      collection(db, 'games'),
      where("status", "==", "lobby"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("JoinGamePage: Successfully received snapshot for active lobbies.");
      const gamesList: ActiveGame[] = [];
      querySnapshot.forEach((doc) => {
        gamesList.push({ ...doc.data(), id: doc.id } as ActiveGame);
      });
      setActiveGames(gamesList);
      setIsLoadingGames(false);
      console.log(`JoinGamePage: Found ${gamesList.length} active lobbies.`);
    }, (error: any) => {
      console.error("JoinGamePage: Error fetching active games. Full error object:", error);
      let detailedDescription = "Could not fetch active game lobbies. You can still join by ID.";
      
      if (error.code === 'failed-precondition' && error.message && error.message.toLowerCase().includes('index')) {
        detailedDescription = "Could not fetch lobbies. Firestore requires an index for this query. Please check the browser's developer console on your computer (or use remote debugging for mobile) for a link to create the necessary index in your Firebase console, then refresh this page.";
      } else if (error.message) {
        detailedDescription = `Error: ${error.message}. You can still join by ID. Check console for more details.`;
      }
      
      toast({
        title: "Error Loading Lobbies",
        description: detailedDescription,
        variant: "destructive",
      });
      setIsLoadingGames(false);
    });

    return () => {
      console.log("JoinGamePage: Unsubscribing from active lobbies listener.");
      unsubscribe();
    };
  }, [toast]);

  const handleLobbyClick = (game: ActiveGame) => {
    setSelectedGame(game);
    setIsJoinDialogOpen(true);
  };
  
  const handleJoinGame = async () => {
    const trimmedScreenName = screenName.trim();
    if (!selectedGame || !trimmedScreenName) {
      toast({
        title: "Screen Name Required",
        description: "Please provide a screen name to join the lobby.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      if (!db) {
        toast({
          title: "Database Error",
          description: "Could not connect to Firestore to join the game.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const gameRef = doc(db, 'games', selectedGame.id);
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        const gameData = gameSnap.data() as Game;
        if (gameData.status === 'lobby') {
          router.push(`/lobby/${selectedGame.id}?screenName=${encodeURIComponent(trimmedScreenName)}`);
        } else {
          toast({
            title: "Game Not Joinable",
            description: "This game is already in progress or has concluded.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Game Not Found",
          description: "The selected lobby no longer exists.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Error",
        description: "Could not join the selected game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsJoinDialogOpen(false);
      setSelectedGame(null);
      setScreenName('');
    }
  };


  const handleDeleteAllActiveLobbies = async () => {
    setIsDeletingAllLobbies(true);
    let deletedCount = 0;
    let errorCount = 0;

    if (!db) {
        toast({ title: "Firestore Error", description: "Database not connected.", variant: "destructive" });
        setIsDeletingAllLobbies(false);
        return;
    }

    try {
        const lobbiesQuery = query(collection(db, 'games'), where("status", "==", "lobby"));
        const lobbiesSnapshot = await getDocs(lobbiesQuery);

        if (lobbiesSnapshot.empty) {
            toast({ title: "No Lobbies", description: "No active lobbies found to delete." });
            setIsDeletingAllLobbies(false);
            return;
        }

        const batch = writeBatch(db);
        lobbiesSnapshot.forEach((gameDoc) => {
          // Note: This does not delete subcollections. A more robust solution for production
          // would involve a Cloud Function to handle cascading deletes.
          // For this app's scope, deleting the game doc is sufficient.
          batch.delete(gameDoc.ref);
          deletedCount++;
        });
        await batch.commit();

        toast({
            title: "Success!",
            description: `Successfully deleted all ${deletedCount} active lobbies.`,
        });

    } catch (error: any) {
        console.error("Error deleting active lobbies:", error);
        toast({
            title: "Error Deleting Lobbies",
            description: `Could not complete lobby deletion: ${error.message || "Unknown error"}.`,
            variant: "destructive",
        });
    } finally {
        setIsDeletingAllLobbies(false);
        setIsDeleteAllConfirmOpen(false);
    }
  };

  return (
    <PageLayout title="Join The Hunch">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <ListChecks className="mr-2 h-5 w-5" /> Active Lobbies
            </CardTitle>
            <CardDescription>
              Click a lobby to join.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[60vh] md:max-h-96 overflow-y-auto space-y-3 pr-2">
            {isLoadingGames && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span>Loading active lobbies...</span>
              </div>
            )}
            {!isLoadingGames && activeGames.length === 0 && (
              <p className="text-muted-foreground text-center p-4">No active lobbies found. Why not start one?</p>
            )}
            {!isLoadingGames && activeGames.map((game) => (
              <Button
                key={game.id}
                variant="outline"
                className="w-full justify-start p-4 h-auto text-left flex flex-col items-start"
                onClick={() => handleLobbyClick(game)}
              >
                <div className="flex items-center w-full justify-between">
                    <span className="font-semibold text-base text-primary truncate" title={game.gameName || `Lobby (ID: ${game.id})`}>
                        {game.gameName || `Unnamed Lobby (ID: ${game.id.substring(0, 6)}...)`}
                    </span>
                    <Server className="h-4 w-4 text-muted-foreground"/>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Created: {game.createdAt instanceof Timestamp ? game.createdAt.toDate().toLocaleString() : 'Recently'}
                </span>
              </Button>
            ))}
          </CardContent>
           <CardFooter className="pt-4">
             <Button
                variant="destructive"
                onClick={() => setIsDeleteAllConfirmOpen(true)}
                disabled={isDeletingAllLobbies || isLoadingGames || activeGames.length === 0}
                className="w-full"
                size="sm"
              >
                {isDeletingAllLobbies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {isDeletingAllLobbies ? 'Deleting Lobbies...' : 'Delete All Active Lobbies'}
              </Button>
           </CardFooter>
        </Card>
      </div>

       <AlertDialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join Lobby: {selectedGame?.gameName || 'Unnamed Lobby'}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your screen name to join this game lobby.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
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
              onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsJoinDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleJoinGame} disabled={isLoading || !screenName.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Lobby
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isDeleteAllConfirmOpen} onOpenChange={setIsDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Active Lobbies?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all game lobbies
              that currently have a "lobby" status.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAllConfirmOpen(false)} disabled={isDeletingAllLobbies}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllActiveLobbies}
              disabled={isDeletingAllLobbies}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeletingAllLobbies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, Delete All Lobbies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
