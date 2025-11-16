
'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Play, Pause, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Simplified data structure for our diagnostic tool
type SpotifyTrackData = {
  songUrl: string;
  songName: string;
};

function InTuneSpotifyDiagnostic() {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackData, setTrackData] = useState<SpotifyTrackData | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(true);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = '/api/spotify/random-track';

  const setupNewRound = useCallback(() => {
    setIsLoadingTrack(true);
    setIsAudioReady(false);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setTrackData(null);

    console.log("--- DIAGNOSTIC PAGE: Fetching from API... ---");
    fetch(apiUrl)
        .then(async res => {
            if (!res.ok) {
                // Try to get a specific error message from the API's JSON response
                const errData = await res.json();
                return Promise.reject(errData.error || `Server responded with status ${res.status}`);
            }
            return res.json();
        })
        .then((data: SpotifyTrackData) => {
            console.log("--- DIAGNOSTIC PAGE: Successfully received track data ---", data);
            setTrackData(data);
            setIsLoadingTrack(false);
        })
        .catch(err => {
            console.error("--- DIAGNOSTIC PAGE: Fetch failed ---", err);
            const errorMessage = typeof err === 'string' ? err : "Could not load track. Check the browser console and server logs for more details.";
            setError(errorMessage);
            toast({
                title: "API Error",
                description: errorMessage,
                variant: "destructive",
                duration: 10000,
            });
            setIsLoadingTrack(false);
        });
  }, [toast, apiUrl]);

  // Initial load and setup
  useEffect(() => {
    setupNewRound();
  }, [setupNewRound]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleCanPlay = () => setIsAudioReady(true);
    const handleError = (e: Event) => {
        console.error("Audio Element Error:", e);
        setError("The audio file could not be played. It might be corrupted or in an unsupported format.");
        toast({ title: "Audio Error", description: "Could not play the provided audio file.", variant: "destructive" });
    };
    audio.addEventListener('loadeddata', handleCanPlay);
    audio.addEventListener('error', handleError);
    return () => {
        audio.removeEventListener('loadeddata', handleCanPlay);
        audio.removeEventListener('error', handleError);
    }
  }, [trackData, toast]);

  const handlePlayPause = () => {
    if (!audioRef.current || !trackData || !isAudioReady) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        toast({ title: "Playback Error", description: "Could not play music.", variant: "destructive"});
      });
    }
    setIsPlaying(!isPlaying);
  };
  
  if (isLoadingTrack) {
    return (
       <PageLayout title="Spotify Diagnostic">
          <div className="flex justify-center items-center h-96">
            <Card className="w-full max-w-2xl shadow-xl hunch-box flex flex-col items-center justify-center p-10 space-y-4">
               <Loader2 className="h-12 w-12 animate-spin text-primary" />
               <p className="font-headline text-lg text-muted-foreground">Contacting Spotify...</p>
            </Card>
          </div>
       </PageLayout>
    );
  }

  return (
    <PageLayout title="Spotify Diagnostic">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl hunch-box">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary flex items-center">
              <Music className="mr-3 h-6 w-6" />
              Connection Test
            </CardTitle>
            <CardDescription>
              This page tests the connection to the Spotify API. If you see a song name, it worked. If you see an error, the API call failed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-md">
                    <h3 className="font-headline text-destructive mb-2">API Error:</h3>
                    <p className="font-mono text-sm text-destructive-foreground bg-destructive/20 p-2 rounded">{error}</p>
                </div>
            )}
            {trackData && (
              <>
                <audio ref={audioRef} src={trackData.songUrl} preload="auto" hidden onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}/>
                <div className="p-4 bg-muted/40 rounded-md space-y-3">
                    <p className="text-sm text-muted-foreground">Song Found:</p>
                    <p className="text-lg font-semibold text-foreground">{trackData.songName}</p>
                    <Button onClick={handlePlayPause} size="lg" disabled={!isAudioReady}>
                        {!isAudioReady ? <Loader2 className="animate-spin" /> : (isPlaying ? <Pause /> : <Play />)}
                        <span className="ml-2">{!isAudioReady ? 'Loading...' : (isPlaying ? 'Pause' : 'Play') }</span>
                    </Button>
                </div>
              </>
            )}
             <Button onClick={setupNewRound} variant="secondary" className="w-full">
                <RefreshCw className="mr-2"/> Run Test Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

export default function InTunePage() {
  return (
    <Suspense fallback={<PageLayout title="Spotify Diagnostic"><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></PageLayout>}>
      <InTuneSpotifyDiagnostic />
    </Suspense>
  )
}
