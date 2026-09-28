import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getUserDoc, getTeamMembers } from '../lib/db';
import {
  blankPassport,
  emptyPerson,
  savePassport,
  setAuthUser,
  isEmailRegistered,
  type Passport,
  type AuthUser,
} from '../utils/storage';
import { GoogleSvg } from '../components/GoogleAuthModal';
import { useInspireBackground } from '../context/InspireBackgroundContext';

export const LoginPage: React.FC = () => {
  useInspireBackground('quiet');
  const navigate = useNavigate();
  const [entranceLoading, setEntranceLoading] = useState<boolean>(false);
  const [entranceError, setEntranceError] = useState<string>('');

  const handleDirectGoogleSignIn = async () => {
    setEntranceLoading(true);
    setEntranceError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const existingDoc = await getUserDoc(firebaseUser.uid);
      const isNewUser = !existingDoc;
      const user: AuthUser = {
        id: firebaseUser.uid,
        name: existingDoc?.name || firebaseUser.displayName || 'Research Scholar',
        email: existingDoc?.email || firebaseUser.email || '',
        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(firebaseUser.uid)}`,
        isNewUser,
      };

      setAuthUser(user);

      // Check Firestore to see if user data already exists in database
      const isAlreadyRegistered = !isNewUser || !!existingDoc || isEmailRegistered(user.email);

      if (isAlreadyRegistered) {
        if (existingDoc) {
          // Fetch team members from subcollection
          const teamMemberDocs = await getTeamMembers(user.id);

          const leaderPerson = {
            name: existingDoc.name || user.name,
            email: existingDoc.email || user.email,
            mobile: existingDoc.phoneNumber || '',
            institution: existingDoc.college || '',
            department: existingDoc.branch || '',
            year: existingDoc.year || '',
            github: existingDoc.githubProfileUrl || '',
            linkedin: existingDoc.linkedinProfileUrl || '',
          };

          const memberPeople = teamMemberDocs.map((m) => ({
            name: m.name || '',
            email: m.email || '',
            mobile: m.phoneNumber || '',
            institution: m.college || '',
            department: m.branch || '',
            year: m.year || '',
            github: '',
            linkedin: m.linkedinProfileUrl || '',
          }));

          const restoredPassport: Passport = {
            category: existingDoc.degree || 'UG',
            track: '',
            team: existingDoc.teamName || '',
            people: [leaderPerson, ...memberPeople],
            registered: true,
            abstracts: [],
          };
          savePassport(restoredPassport);
        }
        navigate('/dashboard');
      } else {
        // New participant registration: auto-fill name & email from Google Auth
        const freshPassport = {
          ...blankPassport(),
          people: [{
            ...emptyPerson(),
            name: user.name || '',
            email: user.email || '',
          }],
          registered: false,
        };
        savePassport(freshPassport);
        navigate('/register');
      }
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setEntranceError('Sign-in failed. Please try again.');
      }
    } finally {
      setEntranceLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8 select-none relative z-10 -mt-2 -mb-20 min-h-[calc(100vh-100px)]">
      {/* 1. Base Collage Artwork Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
      />

      {/* 2. Solid square card - extra big zoom out fit */}
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          width: 'min(96vw, 840px)',
          height: 'min(88vh, 660px)',
          backgroundColor: '#FAF2E5',
          borderRadius: '16px',
          border: '1.5px solid rgba(200,184,154,0.5)',
        }}
      />

      {/* 3. LOCKED REGISTRATION CONTENT */}
      <div className="w-full max-w-3xl sm:max-w-4xl relative z-10 mx-auto my-auto text-center px-8 py-6">
        {/* Institutional Logos */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-3 sm:mb-4">
          <img src="/slrtce-logo.png" alt="SLRTCE" className="h-10 sm:h-14 w-auto object-contain" />
          <div className="h-9 sm:h-12 w-px bg-[#C8B89A]" />
          <img src="/ieee-slrtce-logo.png" alt="IEEE SLRTCE" className="h-10 sm:h-14 w-auto object-contain" />
        </div>

        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs sm:text-sm font-bold tracking-widest text-[#0A2A5E] uppercase mb-4 sm:mb-6">
          REGISTRATION · 2026
        </div>

        {/* INSPIRE Colloquium Logo */}
        <div className="flex items-center justify-center mb-5 sm:mb-6">
          <div className="w-64 sm:w-80 h-28 sm:h-36 rounded-2xl bg-[#000688] border-2 border-dashed border-[#C8B89A] p-3 shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-300 overflow-hidden">
            <img
              src="/inspire-colloquium-logo.png"
              alt="INSPIRE Colloquium"
              className="w-full h-full object-contain rounded-xl drop-shadow-md"
            />
          </div>
        </div>

        {/* Title & Slogan */}
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0A2A5E] leading-tight tracking-tight">
          Sign in with your Google account to continue.
        </h2>

        <p className="text-xs sm:text-sm text-[#5A5A7A] mt-3 max-w-lg mx-auto leading-relaxed">
          If you’re already registered, you’ll be taken directly to your Dashboard. New users will proceed with registration.
        </p>

        {/* Primary Action Button */}
        <div className="mt-5 sm:mt-6 max-w-md mx-auto space-y-2.5">
          <button
            type="button"
            onClick={handleDirectGoogleSignIn}
            disabled={entranceLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#0A2A5E] hover:bg-[#082046] text-white font-bold text-sm sm:text-base py-3.5 sm:py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all active:scale-[0.98] cursor-pointer group min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-6 h-6 bg-white rounded-full p-1 flex items-center justify-center shrink-0 shadow-sm">
              <GoogleSvg className={`w-4 h-4 ${entranceLoading ? 'animate-spin' : ''}`} />
            </div>
            <span className="tracking-wide">{entranceLoading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>
        </div>

        {entranceError && (
          <p className="text-xs text-red-600 text-center mt-2 font-semibold">{entranceError}</p>
        )}

        {/* Concise Dynamic Routing Note */}
        <p className="text-xs text-center text-[#5A5A7A] mt-3 font-medium leading-relaxed">
          Already registered? Go to Dashboard.<br />
          New user? Continue above to register.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
