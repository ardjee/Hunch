
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Play, Edit3, Users, ShieldQuestion, CalendarDays, Info, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase/client';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Game, Player } from '@/lib/types';
import { CHARACTERS_LIST } from '@/lib/characters';
import { Slider } from '@/components/ui/slider';

export default function CreateGamePage() {
  const [step, setStep] = useState(1);
  const [screenName, setScreenName] = useState('');
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalGameDays, setTotalGameDays] = useState(7);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const defaultCharacters = CHARACTERS_LIST.slice(0, maxPlayers).map(c => c.id);
    setSelectedCharacterIds(defaultCharacters);
  }, [maxPlayers]);


  const handleCharacterSelection = (characterId: string, checked: boolean) => {
    let newSelectedIds = [...selectedCharacterIds];

    if (checked) {
      if (!newSelectedIds.includes(characterId)) {
        newSelectedIds.push(characterId);
      }
      if (characterId === 'peasant' && !newSelectedIds.includes('monarch')) {
        newSelectedIds.push('monarch');
      }
    } else {
      newSelectedIds = newSelectedIds.filter(id => id !== characterId);
    }

    setSelectedCharacterIds(newSelectedIds);
  };

  const handleStep1Next = () => {
    if (!screenName.trim() || !gameName.trim()) {
      toast({
        title: "Information Required",
        description: "Please enter a game name and a screen name.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCharacterIds.length < 3) {
      toast({
        title: "Not Enough Characters",
        description: "Please select at least 3 characters to play with.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      if (!db) {
        toast({
          title: "Firebase Error",
          description: "Could not connect to the database. Firebase might not have initialized correctly. Check console logs.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const newPlayerId = doc(collection(db, 'players_placeholder')).id;
      const newGameId = doc(collection(db, 'games_placeholder')).id;

      const hostPlayer: Player = {
        id: newPlayerId,
        screenName: screenName.trim(),
        lives: 1,
        dailyCoins: 2,
        isAdmitted: true,
        createdAt: serverTimestamp(),
      };

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

      await setDoc(doc(db, 'games', newGame.id), newGame);
      await setDoc(doc(db, 'games', newGame.id, 'players', hostPlayer.id), hostPlayer);

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
    }
  };

  const isPeasantSelected = selectedCharacterIds.includes('peasant');

  return (
    <PageLayout title="Start a New Hunch">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl">

          {/* ── Step indicator ── */}
          <div className="flex items-center justify-center gap-2 pt-2 px-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold font-headline transition-all duration-300 ${
                    step === s
                      ? 'bg-amber-800 border-amber-800 text-amber-50 shadow-md scale-110'
                      : step > s
                      ? 'bg-amber-700/40 border-amber-700/60 text-amber-900'
                      : 'bg-transparent border-amber-800/50 text-amber-800/70'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div className={`h-0.5 w-6 transition-all duration-300 ${step > s ? 'bg-amber-700/60' : 'bg-amber-700/20'}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Name & Screen Name ── */}
          {step === 1 && (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-headline text-primary">Your Game, Your Rules</CardTitle>
                <CardDescription>
                  Give your game a name and choose your screen name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="gameName" className="text-base flex items-center">
                    <Edit3 className="mr-2 h-4 w-4 text-primary" /> Name Your Game
                  </Label>
                  <Input
                    id="gameName"
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., The Ultimate Hunch Challenge"
                    className="text-base"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="screenName" className="text-base flex items-center">
                    <User className="mr-2 h-4 w-4 text-primary" /> Your Screen Name
                  </Label>
                  <Input
                    id="screenName"
                    type="text"
                    value={screenName}
                    onChange={(e) => setScreenName(e.target.value)}
                    placeholder="e.g., IntuitiveIzzy"
                    className="text-base"
                    maxLength={20}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="button" className="w-full hunch-glow" onClick={handleStep1Next}>
                  <ArrowRight className="mr-2 h-5 w-5" /> Set Game Parameters
                </Button>
              </CardFooter>
            </>
          )}

          {/* ── STEP 2: Players & Duration ── */}
          {step === 2 && (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-headline text-primary">Game Parameters</CardTitle>
                <CardDescription>
                  Choose how many players can join and how long the game will last.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="maxPlayers" className="text-base flex items-center">
                    <Users className="mr-2 h-4 w-4 text-primary" /> Number of Players
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
                <div className="space-y-1">
                  <Label htmlFor="totalGameDays" className="text-base flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-primary" /> Game Duration
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
              </CardContent>
              <CardFooter className="flex gap-3 pb-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="button" className="flex-1 hunch-glow" onClick={() => setStep(3)}>
                  <ArrowRight className="mr-2 h-4 w-4" /> Characters
                </Button>
              </CardFooter>
            </>
          )}

          {/* ── STEP 3: Characters ── */}
          {step === 3 && (
            <form onSubmit={handleCreateGame}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-headline text-primary flex items-center">
                  <ShieldQuestion className="mr-2 h-5 w-5" /> Available Characters
                </CardTitle>
                <CardDescription className="text-xs">
                  Match the number of players ({maxPlayers}). Fewer = harder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 max-h-[40vh] overflow-y-auto">
                  {CHARACTERS_LIST.map(character => {
                    const isMonarchAndPeasantSelected = character.id === 'monarch' && isPeasantSelected;
                    return (
                      <div key={character.id} className="flex items-start space-x-1.5 min-h-[2.5rem]">
                        <Checkbox
                          id={character.id}
                          checked={selectedCharacterIds.includes(character.id)}
                          onCheckedChange={(checked) => handleCharacterSelection(character.id, !!checked)}
                          disabled={isMonarchAndPeasantSelected}
                          className="h-4 w-4 shrink-0"
                        />
                        <Label
                          htmlFor={character.id}
                          className={`font-normal flex items-center gap-1 text-xs leading-tight ${isMonarchAndPeasantSelected ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <character.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{character.name}</span>
                        </Label>
                      </div>
                    )
                  })}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-amber-800/80 font-medium">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  The fewer characters you select, the harder!!
                </p>
              </CardContent>
              <CardFooter className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 hunch-glow" disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  {isLoading ? 'Creating...' : 'Create Lobby'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
