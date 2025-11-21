
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
    <div
      className="min-h-screen flex flex-col items-center overflow-x-hidden relative"
      style={{
        backgroundImage: "url('/div-background.jpg')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "cover",
      }}
    >
      {/* DESKTOP CONTAINER: Content wrapper that fits within the frame's central area */}
      <div
        className="w-full max-w-4xl flex-grow z-10 relative overflow-x-hidden
                   md:my-8"
      >
        {/* Wrapper for content positioned within the frame's central area */}
        <div className="relative z-10 p-4 sm:p-8 md:p-12 lg:p-16 h-full flex flex-col">
          {showLogo && (
            <header className="w-full mb-6 md:mb-10 text-center pt-4">
              <Link href="/">
                <HunchLogo />
              </Link>
            </header>
          )}
          <main className="w-full flex-grow">
            {title && (
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-sepia-dark mb-6 md:mb-8 text-center uppercase tracking-wide">
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
