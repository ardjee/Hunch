
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Play, Edit3, Users, ShieldQuestion, CalendarDays, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase/client';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Game, Player } from '@/lib/types';
import { CHARACTERS_LIST } from '@/lib/characters';
import { Slider } from '@/components/ui/slider';

export default function CreateGamePage() {
  const [screenName, setScreenName] = useState('');
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalGameDays, setTotalGameDays] = useState(7);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    // When maxPlayers changes, update the selected characters to match
    const defaultCharacters = CHARACTERS_LIST.slice(0, maxPlayers).map(c => c.id);
    setSelectedCharacterIds(defaultCharacters);
  }, [maxPlayers]);


  const handleCharacterSelection = (characterId: string, checked: boolean) => {
    let newSelectedIds = [...selectedCharacterIds];

    if (checked) {
      // Add character to selection
      if (!newSelectedIds.includes(characterId)) {
        newSelectedIds.push(characterId);
      }
      // If peasant is checked, also check monarch
      if (characterId === 'peasant' && !newSelectedIds.includes('monarch')) {
        newSelectedIds.push('monarch');
      }
    } else {
      // Remove character from selection
      newSelectedIds = newSelectedIds.filter(id => id !== characterId);
    }

    setSelectedCharacterIds(newSelectedIds);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("CreateGamePage: handleCreateGame triggered for screenName:", screenName, "and gameName:", gameName);

    if (!screenName.trim() || !gameName.trim()) {
      toast({
        title: "Information Required",
        description: "Please enter a game name and a screen name.",
        variant: "destructive",
      });
      return;
    }
    if (selectedCharacterIds.length < 3) {
      toast({
        title: "Not Enough Characters",
        description: "Please select at least 3 characters to play with.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    console.log("CreateGamePage: isLoading set to true");

    try {
      if (!db) {
        console.error("CreateGamePage: Firestore 'db' instance is not available.");
        toast({
          title: "Firebase Error",
          description: "Could not connect to the database. Firebase might not have initialized correctly. Check console logs.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      console.log("CreateGamePage: Firestore 'db' instance seems available.");

      const newPlayerId = doc(collection(db, 'players_placeholder')).id;
      const newGameId = doc(collection(db, 'games_placeholder')).id;
      console.log(`CreateGamePage: Generated newPlayerId: ${newPlayerId}, newGameId: ${newGameId}`);

      const hostPlayer: Player = {
        id: newPlayerId,
        screenName: screenName.trim(),
        lives: 1,
        dailyCoins: 2,
        isAdmitted: true,
        createdAt: serverTimestamp(),
      };
      console.log("CreateGamePage: Prepared hostPlayer object:", hostPlayer);

      const newGame: Game = {
        id: newGameId,
        gameName: gameName.trim(),
        gameMasterId: newPlayerId,
        maxPlayers: maxPlayers,
        totalGameDays: totalGameDays,
        availableCharacterIds: selectedCharacterIds,
        currentDay: 1,
        currentDayStep: 1,
        status: 'lobby',
        createdAt: serverTimestamp(),
        jackpotAmount: 0,
        playerCharacterSelectionsByDay: {},
        submittedHunches: {},
        playerVotes: {},
      };
      console.log("CreateGamePage: Prepared newGame object:", newGame);

      console.log(`CreateGamePage: Attempting to setDoc for game: ${newGame.id}`, newGame);
      await setDoc(doc(db, 'games', newGame.id), newGame);
      console.log(`CreateGamePage: Successfully setDoc for game: ${newGame.id}`);

      console.log(`CreateGamePage: Attempting to setDoc for host player: ${hostPlayer.id} in game ${newGame.id}`, hostPlayer);
      await setDoc(doc(db, 'games', newGame.id, 'players', hostPlayer.id), hostPlayer);
      console.log(`CreateGamePage: Successfully setDoc for host player: ${hostPlayer.id}`);

      // Store in localStorage for persistence
      localStorage.setItem('lastActiveGameId', newGame.id);
      localStorage.setItem('lastPlayerId', newPlayerId);
      localStorage.setItem('lastScreenName', screenName.trim());


      router.push(`/lobby/${newGame.id}?screenName=${encodeURIComponent(screenName.trim())}&isHost=true&playerId=${newPlayerId}`);

    } catch (error: any) {
      console.error("CreateGamePage: Detailed error creating game:", error);
      let errorMessage = 'Could not create game. Please try again.';
      if (error.message) {
        errorMessage = `Could not create game: ${error.message}`;
      }
      if (error.code) {
         errorMessage += ` (Error code: ${error.code})`;
      }
      if (error.code === 'permission-denied') {
        errorMessage = "Firestore permission denied. Please check your security rules in the Firebase console.";
      }
      toast({
        title: "Error Creating Game",
        description: `${errorMessage} Check browser console & Firestore rules for more details. Full error logged.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("CreateGamePage: isLoading set to false in finally block");
    }
  };

  const isPeasantSelected = selectedCharacterIds.includes('peasant');

  return (
    <PageLayout title="Start a New Hunch">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <form onSubmit={handleCreateGame}>
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-primary">Your Game, Your Rules</CardTitle>
              <CardDescription>
                Customize your game, give it a name, and enter your screen name to kick things off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gameName" className="text-lg flex items-center">
                    <Edit3 className="mr-2 h-5 w-5 text-primary" /> Name Your Game
                  </Label>
                  <Input
                    id="gameName"
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., The Ultimate Hunch Challenge"
                    className="text-base"
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screenName" className="text-lg flex items-center">
                    <User className="mr-2 h-5 w-5 text-primary" /> Your Screen Name
                  </Label>
                  <Input
                    id="screenName"
                    type="text"
                    value={screenName}
                    onChange={(e) => setScreenName(e.target.value)}
                    placeholder="e.g., IntuitiveIzzy"
                    className="text-base"
                    maxLength={20}
                    required
                  />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label htmlFor="maxPlayers" className="text-lg flex items-center">
                            <Users className="mr-2 h-5 w-5 text-primary" /> Number of Players
                        </Label>
                        <Slider
                            id="maxPlayers"
                            min={2}
                            max={12}
                            step={1}
                            value={[maxPlayers]}
                            onValueChange={(value) => setMaxPlayers(value[0])}
                            className="w-full"
                        />
                        <div className="text-center font-bold text-amber-700 w-full">{maxPlayers} Players</div>
                    </div>
                     <div className="space-y-4">
                        <Label htmlFor="totalGameDays" className="text-lg flex items-center">
                            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Game Duration
                        </Label>
                        <Slider
                          id="totalGameDays"
                          min={1}
                          max={14}
                          step={1}
                          value={[totalGameDays]}
                          onValueChange={(value) => setTotalGameDays(value[0])}
                          className="w-full"
                        />
                        <div className="text-center font-bold text-amber-700 w-full">{totalGameDays} Day{totalGameDays > 1 ? 's' : ''}</div>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                    <Label className="text-lg flex items-center">
                      <ShieldQuestion className="mr-2 h-5 w-5 text-primary" /> Available Characters
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {CHARACTERS_LIST.map(character => {
                        const isMonarchAndPeasantSelected = character.id === 'monarch' && isPeasantSelected;
                        return (
                          <div key={character.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={character.id}
                              checked={selectedCharacterIds.includes(character.id)}
                              onCheckedChange={(checked) => handleCharacterSelection(character.id, !!checked)}
                              disabled={isMonarchAndPeasantSelected}
                            />
                            <Label
                              htmlFor={character.id}
                              className={`font-normal flex items-center gap-2 text-sm ${isMonarchAndPeasantSelected ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                            >
                             <character.icon className="h-4 w-4 text-muted-foreground" /> {character.name}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-start gap-2 p-3 mt-2 rounded-md border border-amber-600/50 bg-amber-100/60 text-amber-900/90 text-xs">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                            <p>It is recommended to select characters equal to the number of players.</p>
                            <p className="font-semibold">The fewer characters you select, the harder!!</p>
                        </div>
                    </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full hunch-glow" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                ) : (
                  <Play className="mr-2 h-5 w-5" />
                )}
                {isLoading ? 'Creating Lobby...' : 'Create Lobby & Enter'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PageLayout>
  );
}
