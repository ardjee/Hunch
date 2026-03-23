
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText, Edit3, Check, Users, Award, Info, ThumbsUp, Loader2, Sparkles } from 'lucide-react';
import AbstractBlurredIcon from '@/components/icons/AbstractBlurredIcon';
import { useState } from 'react';
import type { Player } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CurrentRoundActionsProps {
  currentDay: number;
  displayRoundNumber: number;
  isGameMaster: boolean;
  activeChallengeDescription: string | null;
  activeChallengeActualResult: string | null;
  onSetChallenge: (description: string) => void;
  onPlayerSubmitHunch: (hunchText: string) => void;
  onRevealChallengeResult: (result: string) => void;
  players: Player[];
  submittedHunchPlayerIds: Set<string>;
  currentUserId: string;
  playerVotes: { [votingPlayerId: string]: string };
  onPlayerVote: (votedForPlayerId: string) => void;
  currentDayStep: number;
  onProceedToNextStep?: () => Promise<void>;
}

const CurrentRoundActions: React.FC<CurrentRoundActionsProps> = ({
  currentDay,
  displayRoundNumber,
  isGameMaster,
  activeChallengeDescription,
  activeChallengeActualResult,
  onSetChallenge,
  onPlayerSubmitHunch,
  onRevealChallengeResult,
  players,
  submittedHunchPlayerIds,
  currentUserId,
  playerVotes,
  onPlayerVote,
  currentDayStep,
  onProceedToNextStep,
}) => {
  const [gmChallengeInput, setGmChallengeInput] = useState('');
  const [playerHunchInput, setPlayerHunchInput] = useState('');
  const [gmActualResultInput, setGmActualResultInput] = useState('');
  const [isSubmittingHunch, setIsSubmittingHunch] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);


  const currentUserHasSubmittedHunch = submittedHunchPlayerIds.has(currentUserId);
  const allPlayersSubmittedHunch = players.length > 0 && submittedHunchPlayerIds.size === players.length;
  const currentUserHasVoted = !!playerVotes[currentUserId];
  const totalVotesCast = Object.keys(playerVotes).length;
  const allVotesIn = players.length > 0 && totalVotesCast === players.length;

  const handleSetChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmChallengeInput.trim()) return;
    onSetChallenge(gmChallengeInput);
    setGmChallengeInput('');
  };

  const handleSubmitHunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerHunchInput.trim()) return;
    setIsSubmittingHunch(true);
    try {
      await onPlayerSubmitHunch(playerHunchInput);
    } finally {
      setIsSubmittingHunch(false);
    }
  };

  const handleRevealResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmActualResultInput.trim()) return;
    onRevealChallengeResult(gmActualResultInput); 
    setGmActualResultInput('');
  };

  const handleVoteClick = async (playerId: string) => {
    if (isSubmittingVote) return;
    setIsSubmittingVote(true);
    try {
        await onPlayerVote(playerId);
    } finally {
        setIsSubmittingVote(false);
    }
  }

  const titleText = currentDayStep === 2
    ? `Day ${currentDay}, Step 2: Pick the Winner`
    : `Day ${currentDay}, Step 1: The Challenge`;

  return (
    <Card className="hunch-box">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary flex items-center">
          <AbstractBlurredIcon className="w-6 h-6 mr-2" /> {titleText}
        </CardTitle>
        <div className="text-sm font-body text-muted-foreground">
          {currentDayStep === 2 ? (
            <div>
              <p>
                Challenge was: <strong>{activeChallengeDescription || 'N/A'}</strong>
              </p>
              <p>
                Actual Result: <strong className="text-accent">{activeChallengeActualResult || 'Not revealed'}</strong>.
                {!currentUserHasVoted ? " Time to vote!" : " Your vote is recorded."}
              </p>
            </div>
          ) : currentDayStep === 1 && activeChallengeDescription ? (
             <div className="flex flex-col space-y-1 text-sm">
                <span>
                    Today's Challenge: <strong className="text-lg text-primary">{activeChallengeDescription}</strong>
                </span>
                <p>
                    {currentUserHasSubmittedHunch ? "Your hunch is in!" : "Submit your hunch!"}
                </p>
            </div>
          ) : currentDayStep === 1 && isGameMaster ? (
            <p>Game Master: Set the challenge for this round (Step 1).</p>
          ) : (
            <p>Waiting for the Game Master to set the round's challenge (Step 1)...</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentDayStep === 2 && activeChallengeActualResult && (
          <>
            {!currentUserHasVoted && (
              <div className="pt-3 border-t border-dashed">
                <h4 className="text-md font-semibold mb-2 flex items-center">
                  <ThumbsUp className="mr-2 h-5 w-5 text-primary" /> Who Was Closest?
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  The actual result was: <strong>{activeChallengeActualResult}</strong>. Vote for the player whose hunch you think was closest. Your vote is final for this round.
                </p>
                <div className="space-y-2">
                  {players.map(player => (
                      <Button
                        key={player.id}
                        variant="outline"
                        className="w-full justify-start hunch-glow"
                        onClick={() => handleVoteClick(player.id)}
                        disabled={isSubmittingVote}
                      >
                        {isSubmittingVote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Vote for {player.screenName} {player.id === currentUserId && "(Yourself)"}
                      </Button>
                    ))}
                  {players.length === 0 && (
                    <p className="text-sm text-muted-foreground">No players available to vote for in this round.</p>
                  )}
                </div>
              </div>
            )}
            {currentUserHasVoted && (
              <>
                <div className="pt-3 border-t border-dashed">
                  <div className="hunch-box p-3 rounded-md text-center">
                    <ThumbsUp className="inline-block mr-2 h-5 w-5 text-primary" />
                    <span className="font-medium text-primary">Your vote for this round has been submitted!</span>
                  </div>
                </div>
                <div className="pt-4 border-t mt-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="voting-status" className="border border-border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-md font-semibold">Voting Status</span>
                        </span>
                        <Badge variant="secondary">
                          {totalVotesCast} / {players.length} voted
                        </Badge>
                      </AccordionTrigger>
                      <AccordionContent>
                        {players.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No players to show status.</p>
                        ) : (
                          <ul className="space-y-2 pt-2">
                            {players.map(player => (
                              <li key={player.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-md">
                                <span className="text-foreground font-medium">{player.screenName}</span>
                                {playerVotes[player.id] ? (
                                  <Badge variant="default" className="bg-primary text-primary-foreground">
                                    <Check className="mr-1 h-3 w-3" /> Voted
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Pending Vote</Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                {isGameMaster && allVotesIn && onProceedToNextStep && (
                  <div className="pt-4">
                    <Button
                      className="w-full hunch-glow"
                      size="lg"
                      disabled={isProceeding}
                      onClick={async () => {
                        setIsProceeding(true);
                        try { await onProceedToNextStep(); } finally { setIsProceeding(false); }
                      }}
                    >
                      {isProceeding ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                      {isProceeding ? 'Proceeding...' : 'Finalize Voting & Proceed'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {currentDayStep === 1 && (
          <>
            {activeChallengeDescription && !currentUserHasSubmittedHunch && (
              <form onSubmit={handleSubmitHunch} className="space-y-2">
                <div className="space-y-1 hunch-glow p-2 rounded-md">
                  <Label htmlFor="hunchInput" className="text-base">Your Hunch:</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="hunchInput"
                      type="text"
                      value={playerHunchInput}
                      onChange={(e) => setPlayerHunchInput(e.target.value)}
                      placeholder="Enter your prediction..."
                      className="flex-grow"
                      required
                      disabled={isSubmittingHunch}
                    />
                    <Button type="submit" disabled={isSubmittingHunch}>
                      {isSubmittingHunch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Send className="mr-2 h-4 w-4" /> Submit Hunch
                    </Button>
                  </div>
                </div>
              </form>
            )}
            {activeChallengeDescription && currentUserHasSubmittedHunch && (
              <div className="hunch-box p-3 rounded-md text-center">
                <Check className="inline-block mr-2 h-5 w-5 text-primary" />
                <span className="font-medium text-primary">Your hunch for "{activeChallengeDescription}" is submitted! Waiting for results.</span>
              </div>
            )}

            {isGameMaster && !activeChallengeDescription && (
              <form onSubmit={handleSetChallengeSubmit} className="space-y-2 pt-3 border-t border-dashed">
                <div className="space-y-1 hunch-glow rounded-md p-2">
                  <Label htmlFor="challengeDescription" className="text-base flex items-center">
                    <Edit3 className="mr-2 h-5 w-5 text-primary" /> Challenge Description
                  </Label>
                  <Textarea
                    id="challengeDescription"
                    value={gmChallengeInput}
                    onChange={(e) => setGmChallengeInput(e.target.value)}
                    placeholder="e.g., How many steps will we walk on our nature hike today?"
                    rows={2}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <FileText className="mr-2 h-4 w-4" /> Set Challenge for Round
                </Button>
              </form>
            )}

            {activeChallengeDescription && (
              <>
                {/* Show submission status accordion ONLY when not all hunches are in */}
                {!allPlayersSubmittedHunch && (
                  <div className="pt-4 border-t">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="submission-status" className="border border-border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-md font-semibold">Hunch Submission Status</span>
                          </span>
                          <Badge variant="secondary">
                            {submittedHunchPlayerIds.size} / {players.length} submitted
                          </Badge>
                        </AccordionTrigger>
                        <AccordionContent>
                          {players.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No players available to show status.</p>
                          ) : submittedHunchPlayerIds.size === 0 && players.length > 0 ? (
                            <p className="text-sm text-muted-foreground">No hunches submitted yet for this challenge.</p>
                          ) : (
                            <ul className="space-y-2 pt-2">
                              {players.map(player => (
                                <li key={player.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-md">
                                  <span className="text-foreground font-medium">{player.screenName}</span>
                                  {submittedHunchPlayerIds.has(player.id) ? (
                                    <Badge variant="default" className="bg-primary text-primary-foreground">
                                      <Check className="mr-1 h-3 w-3" /> Submitted
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Pending</Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* GM: Reveal actual result — shown on its own once all hunches are in */}
                {isGameMaster && !activeChallengeActualResult && (
                  <>
                    {allPlayersSubmittedHunch ? (
                      <form onSubmit={handleRevealResultSubmit} className="space-y-2 pt-3 border-t border-dashed">
                        <div className="hunch-box p-3 rounded-md text-left flex items-start">
                          <Info className="inline-block mr-3 h-5 w-5 text-primary mt-1 shrink-0" />
                          <p className="font-medium text-sm text-foreground">All players have submitted their hunches! Enter the actual result to begin Step 2.</p>
                        </div>
                        <div className="space-y-2 hunch-glow p-2 rounded-md">
                          <Label htmlFor="actualResultInput" className="text-base flex items-center">
                            <Award className="mr-2 h-5 w-5 text-primary" /> Actual Result of Challenge
                          </Label>
                          <Input
                            id="actualResultInput"
                            type="text"
                            value={gmActualResultInput}
                            onChange={(e) => setGmActualResultInput(e.target.value)}
                            placeholder="e.g., 8500 steps"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" variant="secondary">
                          <Check className="mr-2 h-4 w-4" /> Reveal Actual Result
                        </Button>
                      </form>
                    ) : (
                      players.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Waiting for all players to submit hunches before revealing result.
                        </p>
                      )
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrentRoundActions;
