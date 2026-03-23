
'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, UserPlus, Crown, Play, Users, ShieldCheck, Copy, Info, Loader2, ShieldAlert, Castle, Bot, Settings } from 'lucide-react';
import type { Player, Game } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HunchLogo from '@/components/ui/HunchLogo';
import { db } from '@/lib/firebase/client';
import { doc, collection, onSnapshot, setDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { AI_PROFILES, DEFAULT_AI_PROFILE_ID, generateAiScreenName, getAiProfile } from '@/lib/ai/profiles';
import type { AiProfileId } from '@/lib/ai/types';

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

  const [lobbyView, setLobbyView] = useState<'players' | 'settings'>('players');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameData, setGameData] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [selectedAiProfileId, setSelectedAiProfileId] = useState<AiProfileId>(DEFAULT_AI_PROFILE_ID);
  const [isAddingAi, setIsAddingAi] = useState(false);

  const playerProcessingAttemptedRef = useRef(false);

  useEffect(() => {
    if (isHostFromUrl && playerIdFromUrl) {
      setCurrentPlayerId(playerIdFromUrl);
      if (newPlayerScreenNameFromUrl) {
        localStorage.setItem('lastActiveGameId', gameId);
        localStorage.setItem('lastPlayerId', playerIdFromUrl);
        localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl);
      }
    }
  }, [gameId, isHostFromUrl, playerIdFromUrl, newPlayerScreenNameFromUrl]);

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
    playerProcessingAttemptedRef.current = false;

    const gameDocRef = doc(db, 'games', gameId);
    const unsubscribeGame = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const game = docSnap.data() as Game;
        setGameData(game);
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
  }, [gameId, router, toast]);

  useEffect(() => {
    if (!db) {
        if (newPlayerScreenNameFromUrl && !isHostFromUrl) {
             toast({ title: "Database Error", description: "Cannot process join request. Firestore not ready.", variant: "destructive" });
        }
        return;
    }

    if (!gameId || !newPlayerScreenNameFromUrl || isHostFromUrl || !gameData || playerProcessingAttemptedRef.current) {
      return;
    }

    if (gameData.status !== 'lobby') {
        if(!isHostFromUrl){
            toast({ title: "Game Not in Lobby", description: "This game is not accepting new players.", variant: "destructive"});
            router.push('/');
        }
        return;
    }

    playerProcessingAttemptedRef.current = true;

    const processJoiningPlayer = async () => {
      try {
        const playersQuery = query(collection(db, 'games', gameId, 'players'), where("screenName", "==", newPlayerScreenNameFromUrl));
        const querySnapshot = await getDocs(playersQuery);

        let existingPlayer: Player | null = null;
        let existingPlayerId: string | null = null;

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          existingPlayer = { ...docSnap.data(), id: docSnap.id } as Player;
          existingPlayerId = docSnap.id;
        }

        if (!existingPlayer) {
          const newJoiningPlayerId = doc(collection(db, 'players_placeholder')).id;
          const newPlayerPayload: Player = {
            id: newJoiningPlayerId,
            screenName: newPlayerScreenNameFromUrl,
            lives: 1,
            dailyCoins: 2,
            isAdmitted: false,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'games', gameId, 'players', newJoiningPlayerId), newPlayerPayload);
          setCurrentPlayerId(newJoiningPlayerId);
          localStorage.setItem('lastActiveGameId', gameId);
          localStorage.setItem('lastPlayerId', newJoiningPlayerId);
          localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl);
          toast({ title: "Joined Lobby Queue", description: `You've requested to join as ${newPlayerScreenNameFromUrl}. Waiting for host approval.` });
        } else if (existingPlayerId) {
          setCurrentPlayerId(existingPlayerId);
          localStorage.setItem('lastActiveGameId', gameId);
          localStorage.setItem('lastPlayerId', existingPlayerId);
          localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl);
          toast({ title: "Rejoining Lobby", description: `Welcome back, ${newPlayerScreenNameFromUrl}! Your status is: ${existingPlayer?.isAdmitted ? 'Admitted' : 'Pending approval'}.`, variant: "default" });
        }
      } catch (error: any) {
        console.error("Error processing joining player:", error);
        toast({ title: "Error Joining Lobby", description: `Could not process your request: ${error.message || "Please try again."}`, variant: "destructive" });
      }
    };

    processJoiningPlayer();

  }, [gameId, newPlayerScreenNameFromUrl, isHostFromUrl, gameData, players, toast, router]);


  useEffect(() => {
    if (gameData?.status === 'in-progress' && currentPlayerId && gameId) {
      const currentPlayerDetails = players.find(p => p.id === currentPlayerId);
      if (currentPlayerDetails?.isAdmitted) {
        localStorage.setItem('lastActiveGameId', gameId);
        localStorage.setItem('lastPlayerId', currentPlayerId);
        if (currentPlayerDetails.screenName) {
          localStorage.setItem('lastScreenName', currentPlayerDetails.screenName);
        }
        router.push(`/game/${gameId}?playerId=${currentPlayerId}&screenName=${encodeURIComponent(currentPlayerDetails.screenName)}`);
      } else if (isHostFromUrl && playerIdFromUrl === currentPlayerId) {
        localStorage.setItem('lastActiveGameId', gameId);
        localStorage.setItem('lastPlayerId', currentPlayerId);
        if(newPlayerScreenNameFromUrl) localStorage.setItem('lastScreenName', newPlayerScreenNameFromUrl);
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
    if (admittedPlayersList.length < 1) {
        toast({ title: "Not Enough Players", description: "At least one admitted player (the Game Master) is needed to start.", variant: "destructive"});
        return;
    }
    setIsLoading(true);

    try {
      await updateDoc(doc(db, 'games', gameId), { status: 'in-progress', currentDay: 1, currentDayStep: 1 });
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

  const handleAddAiPlayer = async () => {
    if (!db || !gameId || !gameData || !isCurrentPlayerGameMaster) return;

    if (isLobbyFull) {
      toast({
        title: "Lobby Full",
        description: "Remove someone or raise the player cap before adding AI teammates.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingAi(true);
    try {
      const profile = getAiProfile(selectedAiProfileId);
      const existingNames = players.map((player) => player.screenName);
      const screenName = generateAiScreenName(existingNames, profile);
      const newPlayerId = doc(collection(db, 'players_placeholder')).id;
      const aiPlayerPayload: Player = {
        id: newPlayerId,
        screenName,
        lives: 1,
        dailyCoins: 2,
        isAdmitted: true,
        isAi: true,
        aiProfileId: profile.id,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'games', gameId, 'players', newPlayerId), aiPlayerPayload);
      toast({
        title: "AI Player Added",
        description: `${screenName} (${profile.label}) joined the lobby.`,
      });
    } catch (error) {
      console.error("Error adding AI player:", error);
      toast({
        title: "Unable to Add AI Player",
        description: "Something went wrong while provisioning the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsAddingAi(false);
    }
  };

  if (isPageLoading || !gameData) {
    return (
      <PageLayout title="Loading Lobby...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (gameData.status !== 'lobby' && !isPageLoading) {
      const currentPlayerDetails = players.find(p => p.id === currentPlayerId);
      if (currentPlayerDetails?.isAdmitted && gameData.status === 'in-progress') {
          // Handled by useEffect for redirection
      } else if (!isHostFromUrl) {
        toast({ title: "Game Status Changed", description: `This game is now ${gameData.status}. Returning to home.`, variant: "default" });
        router.push('/');
        return ( <PageLayout title="Redirecting..."><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></PageLayout>);
      }
  }


  const admittedPlayers = players.filter(p => p.isAdmitted);
  const pendingPlayers = players.filter(p => !p.isAdmitted && p.screenName);
  const currentPlayerData = players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerGameMaster = !!(gameData && gameData.gameMasterId === currentPlayerId);
  const isLobbyFull = admittedPlayers.length >= gameData.maxPlayers;
  const canStartGame = isCurrentPlayerGameMaster && !!gameData.gameMasterId && admittedPlayers.length > 0;

  return (
    <PageLayout title={`Lobby: ${gameData.gameName || "The Hunch"}`} showLogo={false}>
      <div className="space-y-2">
        {/* Header banner - solid background for readability */}
        <Card className="bg-accent text-accent-foreground border-0">
          <CardContent className="p-2 text-center">
            <p className="text-sm font-semibold">Waiting for players to join.</p>
            <p className="text-xs opacity-80">
              The Game Master can admit players and start the game.
            </p>
          </CardContent>
        </Card>

        {/* Tab navigation for Game Master */}
        {isCurrentPlayerGameMaster && (
          <div className="flex gap-2">
            <Button
              variant={lobbyView === 'players' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setLobbyView('players')}
            >
              <Users className="mr-2 h-4 w-4" /> Players ({admittedPlayers.length}/{gameData.maxPlayers})
            </Button>
            <Button
              variant={lobbyView === 'settings' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setLobbyView('settings')}
            >
              <Settings className="mr-2 h-4 w-4" /> AI & Settings
            </Button>
          </div>
        )}

        {/* PLAYERS VIEW */}
        {(lobbyView === 'players' || !isCurrentPlayerGameMaster) && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <h3 className="text-sm font-semibold flex items-center">
                <Users className="mr-2 h-4 w-4 text-primary" /> Admitted Players ({admittedPlayers.length} / {gameData.maxPlayers})
              </h3>
              {admittedPlayers.length === 0 && <p className="text-sm text-muted-foreground">No players admitted yet.</p>}
              <div className="space-y-1.5 max-h-[35vh] overflow-y-auto">
                {admittedPlayers.map(player => (
                  <PlayerItem key={player.id} player={player} isGameMaster={player.id === gameData.gameMasterId} />
                ))}
              </div>

              {isCurrentPlayerGameMaster && pendingPlayers.length > 0 && (
                <div className="pt-3 border-t border-border/50">
                  <h3 className="text-base font-semibold mb-2 flex items-center">
                    <UserPlus className="mr-2 h-4 w-4 text-accent" /> Pending ({pendingPlayers.length})
                  </h3>
                  {isLobbyFull && <p className="text-xs text-destructive font-semibold mb-2">Lobby full — cannot admit more.</p>}
                  <div className="space-y-2">
                    {pendingPlayers.map(player => (
                      <PlayerItem key={player.id} player={player} onAdmit={handleAdmitPlayer} isHostView={isCurrentPlayerGameMaster} canAdmit={!isLobbyFull} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SETTINGS VIEW (AI Assistants + Game Master) */}
        {lobbyView === 'settings' && isCurrentPlayerGameMaster && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center mb-1">
                  <Bot className="mr-2 h-4 w-4 text-primary" /> AI Assistants
                  <Badge variant="outline" className="ml-2 uppercase tracking-wide text-[10px]">Beta</Badge>
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Fill seats with AI players who handle all in-game tasks automatically.
                </p>
                <div className="flex flex-col gap-2">
                  <Select value={selectedAiProfileId} onValueChange={(value) => setSelectedAiProfileId(value as AiProfileId)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a playstyle" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROFILES.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddAiPlayer}
                    className="w-full"
                    size="default"
                    disabled={isAddingAi || isLobbyFull}
                  >
                    {isAddingAi ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Bot className="mr-2 h-4 w-4" />
                    )}
                    {isAddingAi ? 'Adding...' : 'Add AI Player'}
                  </Button>
                </div>
                {isLobbyFull && (
                  <p className="text-xs text-destructive mt-2 font-semibold">
                    Lobby is full. Remove a player or increase the cap.
                  </p>
                )}
              </div>

              {admittedPlayers.length > 0 && (
                <div className="pt-3 border-t border-border/50">
                  <Label htmlFor="gameMaster" className="text-base font-semibold flex items-center mb-2">
                    <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Assign Game Master
                  </Label>
                  <Select value={gameData.gameMasterId || undefined} onValueChange={handleSetGameMaster}>
                    <SelectTrigger id="gameMaster" className="w-full">
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
                  <p className="text-xs text-muted-foreground mt-1">The Game Master can also fully participate.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ACTION BUTTONS — always visible */}
        {isCurrentPlayerGameMaster && (
          <div className="flex gap-2">
            <Button onClick={() => router.push('/')} variant="outline" className="flex-1">
              <Castle className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleStartGame}
              className="flex-1 hunch-glow"
              disabled={isLoading || !canStartGame}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {isLoading ? 'Starting...' : 'Start Game'}
            </Button>
          </div>
        )}

        {!isCurrentPlayerGameMaster && currentPlayerData && (
          <div className="space-y-2">
            <p className="text-center text-muted-foreground p-2 rounded-md bg-muted text-sm">
              {currentPlayerData.isAdmitted ? "Waiting for the host to start the game..." : "Waiting for the host to approve your request..."}
            </p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              <Castle className="mr-2 h-4 w-4" /> Back to Main
            </Button>
          </div>
        )}

        {!isCurrentPlayerGameMaster && !currentPlayerData && newPlayerScreenNameFromUrl && (
          <div className="space-y-2">
            <p className="text-center text-muted-foreground p-2 rounded-md bg-muted text-sm flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing your request to join as {newPlayerScreenNameFromUrl}...
            </p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              <Castle className="mr-2 h-4 w-4" /> Back to Main
            </Button>
          </div>
        )}
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
  <div className="flex items-center justify-between p-2 bg-card rounded-lg border">
    <div className="flex items-center space-x-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{getInitials(player.screenName)}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-sm text-card-foreground">{player.screenName}</span>
      {player.isAi && (
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          AI
        </Badge>
      )}
      {isGameMaster && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Crown className="h-4 w-4 text-yellow-500" />
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
