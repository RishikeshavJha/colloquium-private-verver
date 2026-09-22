import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getUserDoc } from '../lib/db';
import { setAuthUser, savePassport, type AuthUser } from '../utils/storage';
import { X, ArrowRight, ShieldCheck } from 'lucide-react';

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
        // Restore passport cache from Firestore doc
        const restoredPassport = {
          category: existingDoc.degree || 'UG',
          track: '',
          team: existingDoc.teamName || '',
          people: [{
            name: existingDoc.name || firebaseUser.displayName || '',
            email: existingDoc.email || firebaseUser.email || '',
            mobile: existingDoc.phoneNumber || '',
            institution: existingDoc.college || '',
            department: existingDoc.branch || '',
            year: existingDoc.year || '',
            github: existingDoc.githubProfileUrl || '',
            linkedin: existingDoc.linkedinProfileUrl || '',
          }],
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
      className={`relative bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-5 sm:p-7 shadow-2xl text-[#0A2A5E] ${
        isModal ? 'max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200' : ''
      }`}
      style={{
        boxShadow: '0 20px 40px -15px rgba(10, 42, 94, 0.25), 0 0 0 1px rgba(200, 184, 154, 0.4)',
      }}
    >
      {/* Decorative corner postage accents */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#C8B89A]" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#C8B89A]" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#C8B89A]" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#C8B89A]" />

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

      {/* Pill Badge */}
      <div className="text-center mb-2">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-[10px] font-bold tracking-widest text-[#0A2A5E] uppercase">
          ✦ INSPIRE COLLOQUIUM 2026 REGISTRATION
        </span>
      </div>

      {/* Header Info */}
      <div className="text-center mb-5">
        <h3 className="font-display text-2xl font-bold text-[#0A2A5E] leading-tight">
          Sign In with Google
        </h3>
        <p className="text-xs text-[#5A5A7A] mt-1.5 max-w-sm mx-auto leading-relaxed">
          Sign in to continue to INSPIRE Colloquium 2026. Registered scholars redirect to Dashboard; new participants proceed to registration.
        </p>
      </div>

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-3 bg-white hover:bg-gray-50 text-[#0A2A5E] text-sm sm:text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 cursor-pointer mt-2 min-h-[52px] border-2 border-[#C8B89A] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <GoogleSvg className="w-5 h-5 animate-spin" />
            <span>Authenticating…</span>
          </>
        ) : (
          <>
            <GoogleSvg className="w-5 h-5" />
            <span>Continue with Google</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </>
        )}
      </button>

      {error && (
        <p className="mt-3 text-xs text-red-600 text-center font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Security note */}
      <div className="mt-5 pt-3 border-t border-[#C8B89A]/40 flex flex-col items-center justify-center gap-1.5 text-[11px] text-[#5A5A7A]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#138808]" />
          <span>Official IEEE SLRTCE Secure Authentication via Firebase</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthCard;
