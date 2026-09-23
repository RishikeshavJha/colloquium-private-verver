import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getUserDoc, getTeamMembers } from '../lib/db';
import { setAuthUser, savePassport, type AuthUser } from '../utils/storage';
import { X, ShieldCheck } from 'lucide-react';

interface GoogleAuthProps {
  initialMode?: 'signup' | 'login' | 'unified';
  onSuccess?: (user: AuthUser) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const GoogleSvg = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

export const GoogleAuthCard: React.FC<GoogleAuthProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user already has a registration doc in Firestore
      const existingDoc = await getUserDoc(firebaseUser.uid);
      const isNewUser = !existingDoc;

      if (existingDoc) {
        // Fetch team members from Firestore subcollection to fully restore the passport
        const teamMemberDocs = await getTeamMembers(firebaseUser.uid);

        const leaderPerson = {
          name: existingDoc.name || firebaseUser.displayName || '',
          email: existingDoc.email || firebaseUser.email || '',
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

        const restoredPassport = {
          category: existingDoc.degree || 'UG',
          track: '',
          team: existingDoc.teamName || '',
          people: [leaderPerson, ...memberPeople],
          registered: true,
          abstracts: [],
        };
        savePassport(restoredPassport);
      }

      const user: AuthUser = {
        id: firebaseUser.uid,
        name: (existingDoc?.name) || firebaseUser.displayName || 'Research Scholar',
        email: (existingDoc?.email) || firebaseUser.email || '',
        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(firebaseUser.uid)}`,
        isNewUser,
      };

      setAuthUser(user);

      if (onSuccess) {
        onSuccess(user);
      } else {
        if (isNewUser) {
          navigate('/register');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        setError('Sign-in was cancelled. Please try again.');
      } else if (msg.includes('network-request-failed')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative text-[#0A2A5E] ${
        isModal
          ? 'bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-5 sm:p-7 shadow-2xl max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200'
          : 'w-full text-center p-0 m-0'
      }`}
      style={
        isModal
          ? {
              boxShadow: '0 20px 40px -15px rgba(10, 42, 94, 0.25), 0 0 0 1px rgba(200, 184, 154, 0.4)',
            }
          : undefined
      }
    >
      {/* Decorative corner postage accents only for modal popup */}
      {isModal && (
        <>
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#C8B89A]" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#C8B89A]" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#C8B89A]" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#C8B89A]" />
        </>
      )}

      {/* Close button if in modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-[#0A2A5E] p-2 rounded-full hover:bg-black/5 transition-colors z-10 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* When rendered inline on page: Institutional Logos & INSPIRE Badge */}
      {!isModal && (
        <>
          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            <img src="/slrtce-logo.png" alt="SLRTCE" className="h-6 sm:h-6.5 w-auto object-contain" />
            <div className="h-4 w-px bg-[#C8B89A]" />
            <img src="/ieee-slrtce-logo.png" alt="IEEE SLRTCE" className="h-6 sm:h-6.5 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A]/80 text-[10px] font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
            REGISTRATION · 2026
          </div>

          <div className="flex items-center justify-center mb-2.5">
            <div className="w-36 sm:w-44 h-16 sm:h-18 rounded-2xl bg-[#000688] p-2 shadow-xs flex items-center justify-center hover:scale-105 transition-transform duration-300 overflow-hidden">
              <img
                src="/inspire-colloquium-logo.png"
                alt="INSPIRE Colloquium"
                className="w-full h-full object-contain rounded-xl drop-shadow-sm"
              />
            </div>
          </div>
        </>
      )}

      {/* Header Info */}
      <div className="text-center mb-2.5 sm:mb-3">
        <h3 className="font-display text-base sm:text-lg md:text-xl font-extrabold text-[#0A2A5E] leading-snug tracking-tight">
          Sign in with your Google account to continue.
        </h3>
        <p className="text-[11px] sm:text-xs text-[#5A5A7A] mt-1 sm:mt-1.5 max-w-md mx-auto leading-relaxed">
          If you’re already registered, you’ll be taken directly to your Dashboard. New users will proceed with registration.
        </p>
      </div>

      {/* Google Sign In Button */}
      <div className="max-w-xs sm:max-w-sm mx-auto">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-[#0A2A5E] hover:bg-[#082046] text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all active:scale-[0.98] cursor-pointer group min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <GoogleSvg className="w-4 h-4 animate-spin" />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 bg-white rounded-full p-1 flex items-center justify-center shrink-0 shadow-xs">
                <GoogleSvg className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Continue with Google</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 text-center font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          {error}
        </p>
      )}

      <p className="text-[11px] sm:text-xs text-center text-[#5A5A7A] mt-2 sm:mt-2.5 font-medium leading-relaxed">
        Already registered? Go to Dashboard.<br />
        New user? Continue above to register.
      </p>

      {/* Security note */}
      <div className="mt-2.5 pt-2 border-t border-[#C8B89A]/30 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] text-[#5A5A7A]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#138808]" />
          <span>Official IEEE SLRTCE Secure Authentication via Firebase</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthCard;
