
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
      className="h-[100dvh] flex flex-col items-center overflow-hidden relative"
      style={{
        backgroundImage: "url('/parchment-background.png')",
        backgroundRepeat: 'repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Top ornamental header - always on top of everything */}
      <div className="w-full shrink-0 z-[200] pointer-events-none fixed top-0 left-0 right-0">
        <img src="/BG_top.png" alt="" className="w-full h-auto block" />
      </div>

      <div
        className="w-full max-w-4xl flex-1 z-10 relative overflow-hidden flex flex-col min-h-0"
      >
        <div className="relative z-10 px-4 pb-2 sm:px-6 md:px-10 lg:px-14 pt-40 flex-1 flex flex-col min-h-0">
          {showLogo && (
            <header className="w-full mb-1 text-center">
              <Link href="/">
                <HunchLogo />
              </Link>
            </header>
          )}
          <main className="w-full flex-1 overflow-y-auto min-h-0">
            {title && (
              <h1 className="text-2xl md:text-3xl font-headline font-bold text-sepia-dark mb-2 text-center uppercase tracking-wide">
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>
      </div>

      {/* Bottom ornamental footer */}
      <div className="w-full shrink-0 z-20 pointer-events-none">
        <img src="/BG_bottom.png" alt="" className="w-full h-auto block" />
      </div>
    </div>
  );
};

export default PageLayout;
