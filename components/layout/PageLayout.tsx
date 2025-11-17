
import React from 'react';
import HunchLogo from '@/components/ui/HunchLogo';
import Link from 'next/link';
import Image from 'next/image';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showLogo?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, showLogo = true }) => {
  return (
    // MOBILE FIRST: Solid parchment-style background on the main container.
    // The actual illustrated parchment image is applied on the inner card so it can scale nicely.
    <div className="min-h-screen flex flex-col items-center bg-background md:p-4">
      
      {/* DESKTOP CONTAINER: On medium screens and up, this gets the border and the parchment background.
          On mobile, it's a transparent full-width container. */}
      <div 
        className="w-full max-w-4xl flex-grow z-10 relative 
                   md:page-border-wrapper md:my-8"
        style={{
          backgroundImage: "url('/hunch_bg1.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top right",
          // Scale image proportionally to cover the card while keeping the castle in the top-right
          backgroundSize: "cover",
        }}
      >
        {/* Wrapper for content to ensure it's above the internal castle image */}
        <div className="relative z-10 p-2 sm:p-4 h-full flex flex-col">
          {showLogo && (
            <header className="w-full mb-6 md:mb-10 text-center pt-4">
              <Link href="/">
                <HunchLogo />
              </Link>
            </header>
          )}
          <main className="w-full flex-grow">
            {title && <h1 className="text-3xl md:text-4xl font-headline font-bold text-sepia-dark mb-6 md:mb-8 text-center uppercase tracking-wide">{title}</h1>}
            {children}
          </main>
          <footer className="w-full mt-10 md:mt-16 text-center text-sepia-medium text-xs pb-4">
            <p>&copy; {new Date().getFullYear()} The Hunch. All rights reserved in this realm and others.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
