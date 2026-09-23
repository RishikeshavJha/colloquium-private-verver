import React from 'react';
import { Link } from 'react-router-dom';
import GoogleAuthCard from '../components/GoogleAuthModal';
import { ArrowLeft } from 'lucide-react';
import { useInspireBackground } from '../context/InspireBackgroundContext';

export const LoginPage: React.FC = () => {
  useInspireBackground('quiet');

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 select-none relative z-10 overflow-hidden min-h-[calc(100vh-110px)] h-full">
      {/* 1. Base Collage Artwork Background (Full Vibrant Color - Flush from Navbar to Footer) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
      />

      {/* 2. Seamless Warm-Cream Negative Space in Square / Rectangular Format (Soft Faded / Feathered Edges, NO Solid Card) */}
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(86vw, 560px)',
          height: 'min(80vh, 460px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '20px',
          filter: 'blur(24px)',
          boxShadow: '0 0 40px 20px #FAF2E5',
        }}
      />
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(80vw, 490px)',
          height: 'min(74vh, 400px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '16px',
          filter: 'blur(12px)',
          boxShadow: '0 0 24px 10px #FAF2E5',
        }}
      />
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(74vw, 430px)',
          height: 'min(68vh, 350px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '14px',
        }}
      />

      {/* 3. Content Container (ZERO solid card, seamlessly floating directly on the faded cream square) */}
      <div className="w-full max-w-md sm:max-w-lg relative z-10 mx-auto my-auto text-center px-4 py-2">
        <GoogleAuthCard initialMode="unified" />
      </div>
    </div>
  );
};

export default LoginPage;
