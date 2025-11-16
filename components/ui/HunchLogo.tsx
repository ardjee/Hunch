import React from 'react';

const HunchLogo = ({ size = 'text-5xl md:text-6xl' }: { size?: string }) => {
  return (
    <div className={`font-logo font-bold ${size} text-sepia-dark`}>
      The Hunch
    </div>
  );
};

export default HunchLogo;
