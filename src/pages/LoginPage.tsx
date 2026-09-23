import React from 'react';
import GoogleAuthCard from '../components/GoogleAuthModal';
import { useInspireBackground } from '../context/InspireBackgroundContext';

export const LoginPage: React.FC = () => {
  useInspireBackground('quiet');

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10 select-none relative z-10 overflow-hidden min-h-[calc(100vh-110px)] h-full">
      {/* 1. Base Collage Artwork Background (Full Vibrant Color - Flush from Navbar to Footer) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
      />

      {/* 2. Content Box with Outline - Clean rectangular card matching Screenshot 2 */}
      <div className="w-full max-w-md sm:max-w-lg relative z-10 mx-auto my-auto text-center px-6 py-6 sm:px-8 sm:py-7 rounded-2xl border-2 border-[#C8B89A] bg-[#FFFDF9]/95 shadow-2xl backdrop-blur-xs">
        <GoogleAuthCard initialMode="unified" />
      </div>
    </div>
  );
};

export default LoginPage;
