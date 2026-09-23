import React from 'react';
import GoogleAuthCard from '../components/GoogleAuthModal';
import { useInspireBackground } from '../context/InspireBackgroundContext';

export const LoginPage: React.FC = () => {
  useInspireBackground('quiet');

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12 select-none relative z-10 min-h-[calc(100vh-120px)]">
      {/* 1. Base Collage Artwork Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
      />

      {/* Overlay backdrop mask for contrast */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0" />

      {/* 2. Responsive, dynamic fit card */}
      <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl relative z-10 mx-auto my-auto text-center px-6 py-8 sm:px-10 sm:py-12 md:px-14 md:py-14 rounded-3xl border-2 border-[#C8B89A] bg-[#FAF2E5]/95 shadow-2xl backdrop-blur-md transition-all">
        <GoogleAuthCard initialMode="unified" />
      </div>
    </div>
  );
};

export default LoginPage;
