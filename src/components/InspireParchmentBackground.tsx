import React from 'react';
import { useInspireBackground, type BackgroundDensity } from '../context/InspireBackgroundContext';

interface InspireParchmentBackgroundProps {
  density?: BackgroundDensity;
}

const densityConfigs = {
  quiet: {
    baseArtOpacity: 0.90,
    centerMaskAlpha: 0.96,
    headerMaskAlpha: 0.98,
    columnMaskOpacity: 0.95,
  },
  normal: {
    baseArtOpacity: 0.96,
    centerMaskAlpha: 0.92,
    headerMaskAlpha: 0.95,
    columnMaskOpacity: 0.90,
  },
  expressive: {
    baseArtOpacity: 1.0,
    centerMaskAlpha: 0.85,
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
          Shows 100% rich original artwork colors on outer edges & frames.
          Dissolves into clean parchment across the central UI safe zone.
          ========================================================================= */}
      <div className="hidden sm:block absolute inset-0">
        {/* Layer 1: Base Artwork Canvas — Full vivid original colors */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1920px] pointer-events-none transition-opacity duration-300"
          style={{
            height: 'min(100%, 1200px)',
            minHeight: '680px',
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: '100% auto',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            opacity: config.baseArtOpacity,
            maskImage: 'linear-gradient(to bottom, black 0%, black 88%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 88%, transparent 100%)',
          }}
        />

        {/* Layer 2: Dedicated Left-Margin Edge Branding (INSPIRE 2026 Wordmark)
            Anchored strictly to the FAR LEFT outer margin (0–15%).
            Displayed in 100% full original color; dissolves smoothly before the center column. */}
        <div
          className="absolute top-1 left-0 w-[300px] md:w-[360px] xl:w-[420px] h-[160px] md:h-[190px] pointer-events-none bg-no-repeat bg-left-top transition-opacity duration-300"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: '1100px auto',
            opacity: 0.95,
            maskImage:
              'linear-gradient(to right, black 0%, black 40%, rgba(0,0,0,0.6) 65%, transparent 90%), linear-gradient(to bottom, black 0%, black 50%, transparent 92%)',
            WebkitMaskImage:
              'linear-gradient(to right, black 0%, black 40%, rgba(0,0,0,0.6) 65%, transparent 90%), linear-gradient(to bottom, black 0%, black 50%, transparent 92%)',
          }}
        />

        {/* Layer 3: Lower-Left Heritage Corner Accent (India Gate, Ashoka Pillar, Books)
            100% full original color in the bottom-left margin. */}
        <div
          className="absolute bottom-1 left-0 w-[420px] lg:w-[500px] h-[360px] lg:h-[420px] pointer-events-none bg-no-repeat bg-left-bottom transition-opacity duration-300"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: '1200px auto',
            opacity: 0.95,
            maskImage:
              'radial-gradient(circle 420px at 0% 100%, black 45%, rgba(0,0,0,0.5) 72%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(circle 420px at 0% 100%, black 45%, rgba(0,0,0,0.5) 72%, transparent 100%)',
          }}
        />

        {/* Layer 4: Lower-Right Modern Tech Corner Accent (High-Speed Train, Rockets, Satellite)
            100% full original color in the bottom-right margin. */}
        <div
          className="absolute bottom-1 right-0 w-[420px] lg:w-[500px] h-[360px] lg:h-[420px] pointer-events-none bg-no-repeat bg-right-bottom transition-opacity duration-300"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: '1200px auto',
            opacity: 0.95,
            maskImage:
              'radial-gradient(circle 420px at 100% 100%, black 45%, rgba(0,0,0,0.5) 72%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(circle 420px at 100% 100%, black 45%, rgba(0,0,0,0.5) 72%, transparent 100%)',
          }}
        />

        {/* =========================================================================
            TARGETED READABILITY MASKS (Between Artwork and UI)
            Only clears the central workspace corridor — NEVER washes out the edges!
            ========================================================================= */}

        {/* Mask A: Central UI Safe-Corridor (Leaves 0–15% and 85–100% completely unmasked) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, transparent 0%, transparent 15%, rgba(250, 246, 238, 0.50) 22%, rgba(250, 246, 238, 0.95) 28%, rgba(250, 246, 238, 0.95) 72%, rgba(250, 246, 238, 0.50) 78%, transparent 85%, transparent 100%)',
            opacity: config.columnMaskOpacity,
          }}
        />

        {/* Mask B: Dedicated Header Safe-Zone (Centered over page titles / controls) */}
        <div
          className="absolute top-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 52% 160px at 50% 65px, rgba(250, 246, 238, ${config.headerMaskAlpha}) 0%, rgba(250, 246, 238, ${config.headerMaskAlpha * 0.85}) 55%, transparent 100%)`,
          }}
        />
      </div>

      {/* =========================================================================
          MOBILE FRAMING SYSTEM (Under 640px)
          Vibrant original artwork ornaments framing top & bottom cleanly.
          ========================================================================= */}
      <div className="block sm:hidden absolute inset-0">
        {/* Mobile Top Fragment: Full original color ornament directly below navbar */}
        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none bg-no-repeat bg-left-top opacity-85"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: '390px auto',
            maskImage:
              'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.7) 45%, transparent 100%), linear-gradient(to right, black 0%, transparent 65%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.7) 45%, transparent 100%), linear-gradient(to right, black 0%, transparent 65%)',
          }}
        />

        {/* Mobile Bottom Fragment: Full original color ornament above footer */}
        <div
          className="absolute bottom-0 right-0 w-56 h-24 pointer-events-none bg-no-repeat bg-right-bottom opacity-75"
          style={{
            backgroundImage: "url('/inspire-registration-artwork.jpg')",
            backgroundSize: '390px auto',
            maskImage:
              'radial-gradient(circle 200px at 100% 100%, black 45%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(circle 200px at 100% 100%, black 45%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
};

export default InspireParchmentBackground;
