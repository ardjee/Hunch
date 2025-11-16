
'use client';

import { useState } from 'react';
import Image from 'next/image';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';

export default function StorageTestPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(Date.now()); // Used to force re-render and re-fetch of the image

  // Using a known image URL from your characters list for the test
  const testImageUrl = 'https://firebasestorage.googleapis.com/v0/b/the-hunch-3cdb0.appspot.com/o/thief.png?alt=media';

  const runTest = () => {
    setStatus('loading');
    setError(null);
    setKey(Date.now()); // Change key to force Image component to re-mount and re-load
  };

  return (
    <PageLayout title="Firebase Storage Test">
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl hunch-box">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary flex items-center">
              <Shield className="mr-3 h-6 w-6" />
              Storage Connection Test
            </CardTitle>
            <CardDescription>
              This page directly tests if the application can read images from your Firebase Storage bucket. This helps diagnose permission issues (like 403 Forbidden errors).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/40 rounded-md space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Attempting to load this image:</p>
              <div className="relative w-48 h-48 mx-auto border-2 border-dashed border-border rounded-md">
                <Image
                  key={key} // Force re-render on re-test
                  src={testImageUrl}
                  alt="Test Image from Firebase Storage"
                  fill
                  style={{ objectFit: 'contain' }}
                  onLoad={() => setStatus('success')}
                  onError={(e) => {
                    setStatus('error');
                    setError('The image failed to load. This confirms a problem with reading from Firebase Storage. The most common cause is missing or incorrect Storage Security Rules, or incorrect Firebase project configuration in your code.');
                    console.error("Storage Test Error Event:", e);
                  }}
                  unoptimized={true} // Important for testing direct access without Next.js cache/optimization getting in the way
                  data-ai-hint="thief character"
                />
              </div>
            </div>

            {status === 'loading' && (
              <div className="p-4 bg-amber-100/60 border border-amber-600/50 rounded-md text-center">
                <p className="font-headline text-amber-800">STATUS: Loading image...</p>
              </div>
            )}
            {status === 'success' && (
              <div className="p-4 bg-green-100 border border-green-600 rounded-md text-center">
                <h3 className="font-headline text-green-800 flex items-center justify-center">
                  <ShieldCheck className="mr-2" /> SUCCESS
                </h3>
                <p className="text-sm text-green-700 mt-1">The image loaded successfully. The application can read from Firebase Storage. If images still don't appear elsewhere, the issue might be an incorrect URL for a specific image.</p>
              </div>
            )}
            {status === 'error' && (
              <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-md text-center">
                 <h3 className="font-headline text-destructive flex items-center justify-center">
                  <ShieldAlert className="mr-2" /> FAILURE
                </h3>
                <p className="text-sm text-destructive-foreground mt-1">{error}</p>
              </div>
            )}
             <Button onClick={runTest} variant="secondary" className="w-full">
                <RefreshCw className="mr-2"/> Run Test Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
