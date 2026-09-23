import React from 'react';
import { useInspireBackground, type BackgroundDensity } from '../context/InspireBackgroundContext';

interface InspireParchmentBackgroundProps {
  density?: BackgroundDensity;
}

const densityConfigs = {
  quiet: {
    baseArtOpacity: 0.90,
    headerMaskAlpha: 0.98,
    columnMaskOpacity: 0.95,
  },
  normal: {
    baseArtOpacity: 0.96,
    headerMaskAlpha: 0.95,
    columnMaskOpacity: 0.90,
  },
  expressive: {
    baseArtOpacity: 1.0,
    headerMaskAlpha: 0.90,
    columnMaskOpacity: 0.82,
  },
};

export const InspireParchmentBackground: React.FC<InspireParchmentBackgroundProps> = ({
  density: propDensity,
}) => {
  const context = useInspireBackground();
  const currentDensity = propDensity || context.density || 'quiet';
  const config = densityConfigs[currentDensity] || densityConfigs.quiet;

  return (
    <div
      className="fixed inset-0 top-[52px] sm:top-[56px] pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* =========================================================================
          DESKTOP & TABLET SAFE-ZONE FRAMING SYSTEM (sm and up)
          Provides a continuous, non-fragmented artwork canvas behind the UI.
          ========================================================================= */}
      <div className="hidden sm:block absolute inset-0">
        {/* Layer 1: Single Unified Base Artwork Canvas — Continuous & Unbroken */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            opacity: config.baseArtOpacity,
          }}
        />

        {/* Central UI Safe-Corridor Overlay (Ensures readability without chopping side art) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, transparent 12%, rgba(250, 246, 238, 0.65) 20%, rgba(250, 246, 238, 0.94) 28%, rgba(250, 246, 238, 0.94) 72%, rgba(250, 246, 238, 0.65) 80%, transparent 88%, transparent 100%)',
            opacity: config.columnMaskOpacity,
          }}
        />

        {/* Dedicated Header Safe-Zone */}
        <div
          className="absolute top-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 55% 160px at 50% 65px, rgba(250, 246, 238, ${config.headerMaskAlpha}) 0%, rgba(250, 246, 238, ${config.headerMaskAlpha * 0.85}) 55%, transparent 100%)`,
          }}
        />
      </div>

      {/* =========================================================================
          MOBILE FRAMING SYSTEM (Under 640px)
          ========================================================================= */}
      <div className="block sm:hidden absolute inset-0">
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.85,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(250, 246, 238, 0.92)',
          }}
        />
      </div>
    </div>
  );
};

export default InspireParchmentBackground;
