
'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, UserPlus, Crown, Play, Users, ShieldCheck, Copy, Info, Loader2, ShieldAlert, Castle } from 'lucide-react';
import type { Player, Game } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HunchLogo from '@/components/ui/HunchLogo';
import { db } from '@/lib/firebase/client';
import { doc, collection, onSnapshot, setDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const getInitials = (name: string) => {
  if (!name) return '';
  const names = name.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

function LobbyContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const gameId = params.gameId as string;
  const newPlayerScreenNameFromUrl = searchParams.get('screenName');
  const isHostFromUrl = searchParams.get('isHost') === 'true';
  const playerIdFromUrl = searchParams.get('playerId');

  const [players, setPlayers] = useState<Player[]>([]);
  const [gameData, setGameData] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For actions like 'Start Game'
  const [isPageLoading, setIsPageLoading] = useState(true); // For initial page content
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null); // Initialize to null
  
  const playerProcessingAttemptedRef = useRef(false);

  // Effect to set host's current ID and localStorage immediately
  useEffect(() => {
    if (isHostFromUrl && playerIdFromUrl) {
      setCurrentPlayerId(playerIdFromUrl); // Set this as soon as possible
      if (newPlayerScreenNameFromUrl) { // screenName from URL is host's name
        localStorage.setItem('lastActiveGameId', gameId);
        localStorage.setItem('lastPlayerId', playerIdFromUrl);
        localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl);
      }
    }
  }, [gameId, isHostFromUrl, playerIdFromUrl, newPlayerScreenNameFromUrl]);

  // Main data subscription effect for game and players
  useEffect(() => {
    if (!gameId) {
      setIsPageLoading(false);
      toast({ title: "Invalid Game ID", description: "No game ID provided.", variant: "destructive" });
      router.push('/');
      return;
    }
    if (!db) {
        setIsPageLoading(false);
        toast({ title: "Database Error", description: "Firestore not initialized. Cannot load lobby.", variant: "destructive" });
        console.error("LobbyContent: Firestore 'db' instance is not available for data subscriptions.");
        router.push('/');
        return;
    }

    setIsPageLoading(true);
    // Reset attempt flag here in case this effect re-runs (e.g. HMR),
    // giving player processing logic a fresh chance if new URL params arrive.
    playerProcessingAttemptedRef.current = false; 

    const gameDocRef = doc(db, 'games', gameId);
    const unsubscribeGame = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const game = docSnap.data() as Game;
        setGameData(game);
        // Redirection logic handled in a separate useEffect based on gameData.status and currentPlayerId
      } else {
        toast({ title: "Game Not Found", description: "This game lobby no longer exists or the ID is incorrect.", variant: "destructive" });
        localStorage.removeItem('lastActiveGameId');
        localStorage.removeItem('lastPlayerId');
        localStorage.removeItem('lastScreenName');
        router.push('/');
      }
      setIsPageLoading(false);
    }, (error) => {
      console.error("Error fetching game document:", error);
      toast({ title: "Error Loading Game", description: "Could not load game data. Please refresh.", variant: "destructive" });
      router.push('/');
      setIsPageLoading(false);
    });

    const playersCollectionRef = collection(db, 'games', gameId, 'players');
    const unsubscribePlayers = onSnapshot(playersCollectionRef, (snapshot) => {
      setPlayers(snapshot.docs.map(playerDoc => ({ ...playerDoc.data(), id: playerDoc.id } as Player)));
    }, (error) => {
      console.error("Error fetching players:", error);
      toast({ title: "Error Loading Players", description: "Could not load player data. Some features might be impacted.", variant: "destructive" });
    });

    return () => {
      unsubscribeGame();
      unsubscribePlayers();
    };
  }, [gameId, router, toast]); // Dependencies are minimal, focused on what triggers re-subscription.

  // Effect for processing a NEW non-host player joining the lobby
  useEffect(() => {
    if (!db) { // Ensure db is available before attempting to process player
        console.error("LobbyContent: Firestore 'db' instance is not available for processing joining player.");
        if (newPlayerScreenNameFromUrl && !isHostFromUrl) { // Only toast for actual join attempts
             toast({ title: "Database Error", description: "Cannot process join request. Firestore not ready.", variant: "destructive" });
        }
        return;
    }

    // Guard conditions
    if (!gameId || !newPlayerScreenNameFromUrl || isHostFromUrl || !gameData || playerProcessingAttemptedRef.current) {
      return; 
    }
    
    // Ensure this runs only if lobby is open, to prevent joining started games
    if (gameData.status !== 'lobby') {
        // If not host and trying to access non-lobby game via URL params for joining.
        if(!isHostFromUrl){
            toast({ title: "Game Not in Lobby", description: "This game is not accepting new players.", variant: "destructive"});
            router.push('/');
        }
        return;
    }

    playerProcessingAttemptedRef.current = true; // Mark that we're attempting to process this player from URL

    const processJoiningPlayer = async () => {
      try {
        // Check if player with this screenName already exists in this game
        const playersQuery = query(collection(db, 'games', gameId, 'players'), where("screenName", "==", newPlayerScreenNameFromUrl));
        const querySnapshot = await getDocs(playersQuery);

        let existingPlayer: Player | null = null;
        let existingPlayerId: string | null = null;

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          existingPlayer = { ...docSnap.data(), id: docSnap.id } as Player;
          existingPlayerId = docSnap.id;
        }

        if (!existingPlayer) { // Player is genuinely new to this game
          const newJoiningPlayerId = doc(collection(db, 'players_placeholder')).id; // Generate a new ID
          const newPlayerPayload: Player = {
            id: newJoiningPlayerId,
            screenName: newPlayerScreenNameFromUrl,
            lives: 1,
            dailyCoins: 2,
            isAdmitted: false, // New players require host approval
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'games', gameId, 'players', newJoiningPlayerId), newPlayerPayload);
          setCurrentPlayerId(newJoiningPlayerId); // Set current user ID for this new player
          localStorage.setItem('lastActiveGameId', gameId);
          localStorage.setItem('lastPlayerId', newJoiningPlayerId);
          localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl);
          toast({ title: "Joined Lobby Queue", description: `You've requested to join as ${newPlayerScreenNameFromUrl}. Waiting for host approval.` });
        } else if (existingPlayerId) { // Player with this screen name already exists (e.g., rejoining)
          setCurrentPlayerId(existingPlayerId); // Set current user ID to existing player's ID
          localStorage.setItem('lastActiveGameId', gameId);
          localStorage.setItem('lastPlayerId', existingPlayerId);
          localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl); // Use URL param name in case of re-entry
          toast({ title: "Rejoining Lobby", description: `Welcome back, ${newPlayerScreenNameFromUrl}! Your status is: ${existingPlayer?.isAdmitted ? 'Admitted' : 'Pending approval'}.`, variant: "default" });
        }
      } catch (error: any) {
        console.error("Error processing joining player:", error);
        toast({ title: "Error Joining Lobby", description: `Could not process your request: ${error.message || "Please try again."}`, variant: "destructive" });
      }
    };

    processJoiningPlayer();

  }, [gameId, newPlayerScreenNameFromUrl, isHostFromUrl, gameData, players, toast, router]); // 'players' is needed for screenName check


  // Effect for navigating to game page when status changes to 'in-progress'
  useEffect(() => {
    if (gameData?.status === 'in-progress' && currentPlayerId && gameId) {
      const currentPlayerDetails = players.find(p => p.id === currentPlayerId);
      if (currentPlayerDetails?.isAdmitted) {
        // Ensure localStorage is set before navigating (it might have been set by other effects already)
        localStorage.setItem('lastActiveGameId', gameId);
        localStorage.setItem('lastPlayerId', currentPlayerId);
        if (currentPlayerDetails.screenName) {
          localStorage.setItem('lastScreenName', currentPlayerDetails.screenName);
        }
        router.push(`/game/${gameId}?playerId=${currentPlayerId}&screenName=${encodeURIComponent(currentPlayerDetails.screenName)}`);
      } else if (isHostFromUrl && playerIdFromUrl === currentPlayerId) {
        // Special case for host: if gameData says 'in-progress' and this IS the host, they should be able to get in.
        // Their player document might not be in `players` state immediately if list is large/slow.
        localStorage.setItem('lastActiveGameId', gameId);
        localStorage.setItem('lastPlayerId', currentPlayerId);
        if(newPlayerScreenNameFromUrl) localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl); // Host's name from URL
        router.push(`/game/${gameId}?playerId=${currentPlayerId}&screenName=${encodeURIComponent(newPlayerScreenNameFromUrl || 'Host')}`);
      }
    }
  }, [gameData, players, currentPlayerId, gameId, router, isHostFromUrl, newPlayerScreenNameFromUrl]);


  const handleAdmitPlayer = async (playerIdToAdmit: string) => {
    if (!gameId || !db || !gameData) return;

    const admittedPlayersCount = players.filter(p => p.isAdmitted).length;
    if (admittedPlayersCount >= gameData.maxPlayers) {
      toast({
        title: "Lobby Full",
        description: `Cannot admit more than the selected ${gameData.maxPlayers} players.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'games', gameId, 'players', playerIdToAdmit), { isAdmitted: true });
      toast({ title: "Player Admitted!", description: `${players.find(p=>p.id===playerIdToAdmit)?.screenName} can now join the game.`});
    } catch (error) {
      console.error("Error admitting player:", error);
      toast({ title: "Error", description: "Could not admit player. Please try again.", variant: "destructive" });
    }
  };

  const handleSetGameMaster = async (selectedGameMasterId: string | undefined) => {
    if (!selectedGameMasterId || !gameId || !gameData || !db) return;
    try {
      await updateDoc(doc(db, 'games', gameId), { gameMasterId: selectedGameMasterId });
      toast({ title: "Game Master Set", description: `${players.find(p=>p.id===selectedGameMasterId)?.screenName} is now the Game Master.` });
    } catch (error) {
      console.error("Error setting game master:", error);
      toast({ title: "Error", description: "Could not set game master. Please try again.", variant: "destructive" });
    }
  };

  const handleStartGame = async () => {
    if (!gameId || !gameData?.gameMasterId || !db) {
      toast({ title: "Game Master Required", description: "Please assign a Game Master before starting.", variant: "destructive" });
      return;
    }
    const admittedPlayersList = players.filter(p => p.isAdmitted);
    if (admittedPlayersList.length < 1) { // Game master is a player, so min 1
        toast({ title: "Not Enough Players", description: "At least one admitted player (the Game Master) is needed to start.", variant: "destructive"});
        return;
    }
    setIsLoading(true);

    try {
      await updateDoc(doc(db, 'games', gameId), { status: 'in-progress', currentDay: 1, currentDayStep: 1 });
      // Navigation to game page will be handled by the useEffect listening to gameData.status
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Error Starting Game",
        description: "Could not update game status. Please try again.",
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };
  
  // This is the primary loading condition for the page content.
  if (isPageLoading || !gameData) { 
    return (
      <PageLayout title="Loading Lobby...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  // If game is no longer in lobby state (e.g., started by another tab), and current user is not yet redirected.
  // This is a fallback, main redirection is handled by useEffect.
  if (gameData.status !== 'lobby' && !isPageLoading) {
      const currentPlayerDetails = players.find(p => p.id === currentPlayerId);
      if (currentPlayerDetails?.isAdmitted && gameData.status === 'in-progress') {
          // Handled by useEffect for redirection. This part is defensive.
      } else if (!isHostFromUrl) { // Only push non-hosts away from a non-lobby game if they aren't part of it.
        toast({ title: "Game Status Changed", description: `This game is now ${gameData.status}. Returning to home.`, variant: "default" });
        router.push('/');
        return ( <PageLayout title="Redirecting..."><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></PageLayout>);
      }
  }


  const admittedPlayers = players.filter(p => p.isAdmitted);
  const pendingPlayers = players.filter(p => !p.isAdmitted && p.screenName); // Ensure they have a screenName to show
  const currentPlayerData = players.find(p => p.id === currentPlayerId);
  // The host is a dynamic role based on gameMasterId. The isHostFromUrl param is only for initial entry/creation.
  // The person with GM powers is always the gameData.gameMasterId.
  const isCurrentPlayerGameMaster = !!(gameData && gameData.gameMasterId === currentPlayerId);
  const isLobbyFull = admittedPlayers.length >= gameData.maxPlayers;


  return (
    <PageLayout title={`Lobby: ${gameData.gameName || "The Hunch"}`} showLogo={false}>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="text-center pt-2">
                <p className="text-lg font-semibold text-foreground">Waiting for players to join.</p>
                <CardDescription className="text-sm">
                    The Game Master can admit players and start the game.
                </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Admitted Players ({admittedPlayers.length} / {gameData.maxPlayers})</h3>
              {admittedPlayers.length === 0 && <p className="text-muted-foreground">No players admitted yet. New joiners will appear in 'Pending Approval'.</p>}
              <div className="space-y-3">
                {admittedPlayers.map(player => (
                  <PlayerItem key={player.id} player={player} isGameMaster={player.id === gameData.gameMasterId} />
                ))}
              </div>
            </div>

            {isCurrentPlayerGameMaster && pendingPlayers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><UserPlus className="mr-2 h-5 w-5 text-accent" /> Pending Approval ({pendingPlayers.length})</h3>
                {isLobbyFull && <p className="text-sm text-destructive font-semibold mb-2">Lobby is full. Cannot admit more players.</p>}
                <div className="space-y-3">
                  {pendingPlayers.map(player => (
                    <PlayerItem key={player.id} player={player} onAdmit={handleAdmitPlayer} isHostView={isCurrentPlayerGameMaster} canAdmit={!isLobbyFull} />
                  ))}
                </div>
              </div>
            )}
             {isCurrentPlayerGameMaster && pendingPlayers.length === 0 && players.filter(p => !p.isAdmitted).length > 0 && (
                <p className="text-sm text-muted-foreground">No other players currently waiting for approval.</p>
            )}


            {isCurrentPlayerGameMaster && admittedPlayers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="gameMaster" className="text-lg font-semibold flex items-center">
                  <ShieldCheck className="mr-2 h-5 w-5 text-primary" /> Assign Game Master
                </Label>
                <Select value={gameData.gameMasterId || undefined} onValueChange={handleSetGameMaster}>
                  <SelectTrigger id="gameMaster" className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select a Game Master" />
                  </SelectTrigger>
                  <SelectContent>
                    {admittedPlayers.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.screenName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The Game Master can also fully participate in the game.</p>
              </div>
            )}
          </CardContent>
          
          {isCurrentPlayerGameMaster && (
            <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 pt-4">
               <Button onClick={() => router.push('/')} variant="outline" className="w-full sm:flex-1" size="lg">
                <Castle className="mr-2 h-5 w-5" /> Back to Main
              </Button>
              <Button onClick={handleStartGame} className="w-full sm:flex-1" size="lg" disabled={isLoading || !gameData.gameMasterId || admittedPlayers.length === 0}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Play className="mr-2 h-5 w-5" />
                )}
                {isLoading ? 'Starting Game...' : 'Start Game'}
              </Button>
            </CardFooter>
          )}

          {!isCurrentPlayerGameMaster && currentPlayerData && (
            <>
              <CardContent className="pt-0">
                  <p className="text-center text-muted-foreground p-4 rounded-md bg-muted">
                      {currentPlayerData.isAdmitted ? "Waiting for the host to start the game..." : "Waiting for the host to approve your request..."}
                  </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button onClick={() => router.push('/')} variant="outline" className="w-full" size="lg">
                  <Castle className="mr-2 h-5 w-5" /> Back to Main
                </Button>
              </CardFooter>
            </>
          )}

           {!isCurrentPlayerGameMaster && !currentPlayerData && newPlayerScreenNameFromUrl && (
             <>
              <CardContent className="pt-0">
                  <p className="text-center text-muted-foreground p-4 rounded-md bg-muted flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing your request to join as {newPlayerScreenNameFromUrl}...
                  </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button onClick={() => router.push('/')} variant="outline" className="w-full" size="lg">
                  <Castle className="mr-2 h-5 w-5" /> Back to Main
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}

interface PlayerItemProps {
  player: Player;
  isGameMaster?: boolean;
  onAdmit?: (playerId: string) => void;
  isHostView?: boolean;
  canAdmit?: boolean;
}

const PlayerItem: React.FC<PlayerItemProps> = ({ player, isGameMaster, onAdmit, isHostView, canAdmit }) => (
  <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
    <div className="flex items-center space-x-3">
      <Avatar>
        <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(player.screenName)}`} alt={player.screenName} data-ai-hint="avatar profile" />
        <AvatarFallback>{getInitials(player.screenName)}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-card-foreground">{player.screenName}</span>
      {isGameMaster && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Crown className="h-5 w-5 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Game Master</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    {isHostView && !player.isAdmitted && onAdmit && (
      <Button variant="outline" size="sm" onClick={() => onAdmit(player.id)} disabled={!canAdmit}>
        <UserCheck className="mr-1 h-4 w-4" /> Admit
      </Button>
    )}
  </div>
);

export default function LobbyPage() {
  return (
    <Suspense fallback={<PageLayout title="Loading Lobby..."><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></PageLayout>}>
      <LobbyContent />
    </Suspense>
  );
}
