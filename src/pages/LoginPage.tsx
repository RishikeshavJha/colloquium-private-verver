import React from 'react';
import { Link } from 'react-router-dom';
import GoogleAuthCard from '../components/GoogleAuthModal';
import { ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8 select-none relative z-10 -mt-2 -mb-20 min-h-[calc(100vh-100px)]">
      {/* 1. Base Collage Artwork Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
      />

      {/* 2. Seamless Warm-Cream Negative Space (ZERO card edges, dissolves into collage pathways) */}
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(94vw, 760px)',
          height: 'min(86vh, 570px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '52% 48% 54% 46% / 46% 54% 46% 54%',
          filter: 'blur(20px)',
        }}
      />
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(88vw, 680px)',
          height: 'min(80vh, 500px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '44% 56% 48% 52% / 54% 44% 56% 46%',
          filter: 'blur(10px)',
        }}
      />
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(80vw, 590px)',
          height: 'min(74vh, 440px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '48% 52% 46% 54% / 50% 48% 52% 50%',
        }}
      />

      {/* 3. Locked Content Container (ZERO card) */}
      <div className="w-full max-w-xl sm:max-w-2xl relative z-10 mx-auto my-auto text-center px-4 py-2">
        <div className="mb-3 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A2A5E] bg-[#FAF2E5] hover:bg-white px-3 py-1 rounded-full border border-[#C8B89A]/60 shadow-xs transition-all hover:scale-105"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Homepage
          </Link>
        </div>

        <GoogleAuthCard initialMode="unified" />
      </div>
    </div>
  );
};

export default LoginPage;
