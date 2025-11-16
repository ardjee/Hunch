
import { NextRequest, NextResponse } from 'next/server';

// This is the main function that will be executed when the API route is called.
export async function GET(request: NextRequest) {
  console.log('--- API: /api/spotify/random-track route was hit ---');

  // To be robust, check for both prefixed and non-prefixed env vars.
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID || process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID;

  console.log('--- API: Reading environment variables ---');
  console.log(`--- API (DEBUG): Client ID loaded: ${clientId ? 'Yes' : 'No'}`);
  console.log(`--- API (DEBUG): Client Secret loaded: ${clientSecret ? 'Yes' : 'No'}`);
  console.log(`--- API (DEBUG): Playlist ID loaded: ${playlistId ? 'Yes' : 'No'}`);

  if (!clientId || !clientSecret || !playlistId) {
    const missingVars = [
      !clientId && '(SPOTIFY_CLIENT_ID or NEXT_PUBLIC_SPOTIFY_CLIENT_ID)',
      !clientSecret && '(SPOTIFY_CLIENT_SECRET or NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET)',
      !playlistId && '(SPOTIFY_PLAYLIST_ID or NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID)',
    ].filter(Boolean).join(', ');

    const errorMessage = `Server configuration error: Missing required environment variables: ${missingVars}. Please check your .env.local file and restart the server.`;
    console.error(`--- API (FAILURE): ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  try {
    // Step 1: Get Access Token
    console.log('--- API: Attempting to fetch Spotify access token... ---');
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`--- API (FAILURE): Failed to get access token. Status: ${authResponse.status}. Body: ${errorText}`);
      return NextResponse.json({ error: `Spotify authentication failed. Status: ${authResponse.status}` }, { status: 500 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('--- API (SUCCESS): Successfully obtained Spotify access token. ---');

    // Step 2: Get Playlist Tracks
    console.log(`--- API: Attempting to fetch playlist tracks for ID: ${playlistId}... ---`);
    const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?market=NL`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!playlistResponse.ok) {
        const errorText = await playlistResponse.text();
        // Try parsing JSON, but gracefully handle if it's not JSON
        let errorMessage = `Failed to fetch playlist. Status: ${playlistResponse.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = `Failed to fetch playlist. Spotify API said: ${errorJson.error.message}`;
        } catch(e) {
            errorMessage = `Failed to fetch playlist. Spotify returned non-JSON error: ${errorText}`;
        }
        console.error(`--- API (FAILURE): ${errorMessage}. Full body: ${errorText}`);
        return NextResponse.json({ error: errorMessage }, { status: playlistResponse.status });
    }
    
    const playlistData = await playlistResponse.json();
    console.log(`--- API (SUCCESS): Successfully fetched playlist "${playlistData.name}". Found ${playlistData.tracks.items.length} total tracks. ---`);

    // Step 3: Filter for playable tracks and select one
    const playableTracks = playlistData.tracks.items.filter((item: any) => item.track && item.track.preview_url);
    console.log(`--- API: Found ${playableTracks.length} tracks with a playable preview_url. ---`);

    if (playableTracks.length === 0) {
      console.error('--- API (FAILURE): No playable tracks found in the playlist. ---');
      return NextResponse.json({ error: 'No tracks with a playable preview were found in the provided playlist.' }, { status: 404 });
    }

    const randomTrack = playableTracks[Math.floor(Math.random() * playableTracks.length)].track;
    
    const responsePayload = {
      songUrl: randomTrack.preview_url,
      songName: `${randomTrack.name} by ${randomTrack.artists.map((artist: any) => artist.name).join(', ')}`,
    };

    console.log(`--- API (SUCCESS): Selected random track: "${responsePayload.songName}". Returning to client. ---`);
    return NextResponse.json(responsePayload);

  } catch (error: any) {
    console.error("--- API (FAILURE): An unexpected error occurred in the GET handler. ---", error.message);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
  }
}
