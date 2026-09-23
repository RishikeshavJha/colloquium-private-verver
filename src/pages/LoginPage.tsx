import React from 'react';
import GoogleAuthCard from '../components/GoogleAuthModal';
import { useInspireBackground } from '../context/InspireBackgroundContext';

export const LoginPage: React.FC = () => {
  useInspireBackground('quiet');

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center select-none relative z-10 h-full" style={{ minHeight: '100%' }}>
      {/* Full-bleed collage background — stretches to fill entire space between nav & footer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
      />

      {/* Subtle dark overlay for readability on mobile */}
      <div className="absolute inset-0 z-[1] bg-black/10 sm:bg-transparent" />

      {/* Centered login card — full-width on mobile, capped on larger screens */}
      <div className="relative z-10 w-full px-4 py-6 sm:px-0 flex items-center justify-center">
        <div
          className="w-full max-w-[95vw] sm:max-w-sm md:max-w-md text-center px-5 py-5 sm:px-7 sm:py-7 rounded-2xl border-2 border-[#C8B89A] bg-[#FFFDF9]/97 shadow-2xl"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <GoogleAuthCard initialMode="unified" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
