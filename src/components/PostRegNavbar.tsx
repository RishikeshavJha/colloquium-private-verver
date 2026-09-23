import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Lock, CreditCard } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getAuthUser, loadPassport, setAuthUser, type AuthUser } from '../utils/storage';

interface NavLinkItem {
  name: string;
  path: string;
  authRequired: boolean;
  locked?: boolean;
  isPayment?: boolean;
}

const allNavLinks: NavLinkItem[] = [
  { name: 'Dashboard', path: '/dashboard', authRequired: true },
  { name: 'Submit Idea', path: '/submit', authRequired: true },
  { name: 'Profile', path: '/profile', authRequired: true },
  { name: 'Guidelines', path: '/guidelines', authRequired: false, locked: true },
  { name: 'Community', path: '/community', authRequired: false },
];

const PostRegNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(() => !!loadPassport().registered);
  const [hasSubmitted, setHasSubmitted] = useState(() => {
    const p = loadPassport();
    return !!(p.abstracts && p.abstracts.length > 0);
  });
  const [user, setUser] = useState<AuthUser | null>(getAuthUser());

  useEffect(() => {
    // Check registration status on route change or mount
    const p = loadPassport();
    setIsRegistered(!!p.registered);
    setHasSubmitted(!!(p.abstracts && p.abstracts.length > 0));
  }, [location.pathname]);

  useEffect(() => {
    // Subscribe to Firebase auth state — updates in real time on login/logout
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const cachedUser = getAuthUser();
        // Use cached user info (name/avatar) if UID matches, else build from Firebase
        const u: AuthUser = cachedUser && cachedUser.id === firebaseUser.uid
          ? cachedUser
          : {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Scholar',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || undefined,
            };
        setUser(u);
        setAuthUser(u);
        const passport = loadPassport();
        setIsRegistered(!!passport.registered);
        setHasSubmitted(!!(passport.abstracts && passport.abstracts.length > 0));
      } else {
        // Signed out
        const passport = loadPassport();
        setUser(null);
        setAuthUser(null);
        setIsRegistered(!!passport.registered);
        setHasSubmitted(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const isEntrancePage = location.pathname === '/register' || location.pathname === '/login';

  return (
    <header className="w-full sticky top-0 z-50 bg-[#0A2A5E] text-white py-3 sm:py-4 transition-all duration-300 shrink-0 shadow-md">
      <div className="w-full px-3 sm:px-6 flex justify-between items-center relative">
        {/* Left: Branding — SLRTCE links to slrtce.in */}
        <div className="flex items-center space-x-3 sm:space-x-4 text-white shrink-0">
          <a
            href="https://slrtce.in/"
            target="_blank"
            rel="noopener noreferrer"
            title="Shree L. R. Tiwari College of Engineering (SLRTCE)"
            className="transition-transform hover:scale-105 active:scale-95"
          >
            <img src="/slrtce-logo.png" alt="SLRTCE Logo" className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm" />
          </a>
          <div className="h-8 sm:h-9 w-px bg-white/30" />
          <div title="IEEE SLRTCE Student Branch" className="flex items-center">
            <img src="/ieee-slrtce-logo-white.png" alt="IEEE SLRTCE Logo" className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm" />
          </div>
          <div className="h-7 sm:h-8 w-px bg-white/30 hidden sm:block" />
          <div className="hidden sm:flex flex-col select-none">
            <span className="text-xs font-extrabold tracking-widest text-amber-400 uppercase leading-none">
              INSPIRE 2026
            </span>
            <span className="text-[10px] text-white/80 font-sans leading-tight mt-0.5">
              IEEE SLRTCE Student Branch
            </span>
          </div>
        </div>

        {/* Center: Nav links (Only shown if registration is complete AND not on entrance/registration page) */}
        {!isEntrancePage && isRegistered ? (
          <nav className="hidden lg:flex space-x-1 xl:space-x-2 items-center font-sans font-bold text-[0.72rem] xl:text-[0.78rem] tracking-wide lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            {allNavLinks.map((link) => {
              // Replace "Submit Idea" with "Payment" after submission
              const resolvedLink = (link.path === '/submit' && hasSubmitted)
                ? { ...link, name: 'Payment', path: '/payment', isPayment: true }
                : link;
              const isActive = location.pathname === resolvedLink.path && !resolvedLink.isPayment;

              if ('locked' in resolvedLink && resolvedLink.locked) {
                return (
                  <div
                    key={link.path}
                    title="Guidelines are currently under review and locked"
                    className="relative group px-3 py-1 rounded-full inline-flex items-center gap-1.5 text-white/45 cursor-not-allowed select-none transition-all hover:bg-white/5"
                  >
                    <span>{link.name}</span>
                    <Lock className="w-3 h-3 text-amber-300/80 shrink-0" />
                    {/* Hover block tooltip */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                      <div className="bg-[#061838] text-amber-300 text-[10.5px] font-bold py-1 px-2.5 rounded-lg shadow-xl border border-amber-300/35 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Section Locked · Under Finalization</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={resolvedLink.path + resolvedLink.name}
                  to={resolvedLink.path}
                  className={`transition-all px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${
                    resolvedLink.isPayment
                      ? 'text-amber-300 hover:text-white hover:bg-white/15 border border-amber-400/40'
                      : isActive
                      ? 'bg-white text-[#0A2A5E] shadow-sm scale-105 font-extrabold'
                      : 'text-white/90 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {resolvedLink.isPayment && <CreditCard className="w-3 h-3" />}
                  <span>{resolvedLink.name}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-xs text-amber-200/90 font-medium md:absolute md:left-1/2 md:-translate-x-1/2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-extrabold tracking-widest uppercase text-amber-300">
              {isEntrancePage ? 'Registration' : 'SLRTCE Mumbai'}
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isEntrancePage && isRegistered && user && (
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
              <span className="text-xs font-bold text-amber-300">{user.name.split(' ')[0]}</span>
              <button
                onClick={async () => {
                  await signOut(auth);
                  setAuthUser(null);
                  setUser(null);
                  setIsRegistered(false);
                  navigate('/');
                }}
                className="text-[10px] text-white/80 hover:text-white underline cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                Logout
              </button>
            </div>
          )}

          {/* Mobile menu trigger — STRICTLY hidden until registration is complete */}
          {!isEntrancePage && isRegistered && (
            <button
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-white focus:outline-none hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu — ONLY available for registered participants */}
      {!isEntrancePage && isRegistered && mobileOpen && (
        <div className="w-full bg-[#0A2A5E] text-white shadow-2xl flex flex-col items-center py-4 space-y-2 lg:hidden border-t border-white/15 animate-in slide-in-from-top-2 duration-200">
          {allNavLinks.map((link) => {
            if ('locked' in link && link.locked) {
              return (
                <div
                  key={link.path}
                  title="Guidelines are currently locked and being finalized"
                  className="text-sm font-semibold px-6 py-3 min-h-[44px] rounded-xl w-[90%] text-center inline-flex items-center justify-center gap-2 text-white/45 cursor-not-allowed select-none bg-white/5"
                >
                  <span>{link.name}</span>
                  <Lock className="w-3.5 h-3.5 text-amber-300/80" />
                  <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full ml-1">
                    Locked
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={link.path + link.name}
                to={(link.path === '/submit' && hasSubmitted) ? '/payment' : link.path}
                className={`text-sm font-semibold transition-colors px-6 py-3 min-h-[44px] rounded-xl w-[90%] text-center inline-flex items-center justify-center gap-2 ${
                  location.pathname === link.path
                    ? 'bg-white text-[#0A2A5E] font-bold shadow-sm'
                    : link.path === '/submit' && hasSubmitted
                    ? 'text-amber-300 hover:bg-white/10 border border-amber-400/30'
                    : 'text-white/90 hover:bg-white/10 hover:text-[#FF9933]'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.path === '/submit' && hasSubmitted && <CreditCard className="w-4 h-4" />}
                <span>{link.path === '/submit' && hasSubmitted ? 'Payment' : link.name}</span>
              </Link>
            );
          })}

          {/* Mobile user badge + logout */}
          {user && (
            <div className="flex items-center gap-3 mt-2 pt-3 border-t border-white/15 w-[90%] justify-center">
              <span className="text-xs font-bold text-amber-300">{user.name.split(' ')[0]}</span>
              <button
                onClick={async () => {
                  await signOut(auth);
                  setAuthUser(null);
                  setUser(null);
                  setIsRegistered(false);
                  setMobileOpen(false);
                  navigate('/');
                }}
                className="text-xs text-white/80 hover:text-white underline min-h-[44px] px-3 flex items-center"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* Torn Paper Edge (Seamless & Absolutely Zero Line Seam) */}
      <div className="absolute top-[calc(100%-8px)] left-0 w-full max-w-full overflow-hidden pointer-events-none z-30">
        <svg
          viewBox="0 0 1440 45"
          preserveAspectRatio="none"
          className="w-full h-5 sm:h-6 block"
          style={{
            filter: 'drop-shadow(0 3px 3px rgba(10, 42, 94, 0.16)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08))',
          }}
        >
          <defs>
            <filter id="postreg-torn" x="-2%" y="-15%" width="104%" height="150%">
              <feTurbulence type="fractalNoise" baseFrequency="0.14 0.22" numOctaves="5" seed="83" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            </filter>
          </defs>

          {/* Layer 1: Parchment core fringe (deckle extends only below y=8 so top is completely clear) */}
          <path
            d="M 1440,8 L 1440,19.5 L 1422,22 L 1410,19.5 L 1395,23.5 L 1386,20 L 1370,22.5 L 1358,27.5 L 1345,25 L 1334,19.5 L 1320,19 L 1308,22.5 L 1295,29 L 1282,33 L 1275,29 L 1264,33.5 L 1252,27.5 L 1240,21 L 1228,19.5 L 1215,22.5 L 1202,18 L 1190,20 L 1178,25.5 L 1165,30 L 1152,26 L 1140,30.5 L 1132,27 L 1120,22 L 1108,19.5 L 1095,18.5 L 1082,21 L 1070,19 L 1058,23.5 L 1045,27 L 1032,21 L 1020,19 L 1008,18 L 995,20.5 L 982,24 L 970,29 L 958,34 L 950,30.5 L 938,36 L 928,31.5 L 916,26 L 904,22 L 892,19 L 880,18 L 868,20.5 L 856,19 L 844,21 L 832,17.5 L 820,16 L 808,18 L 796,21 L 784,19 L 772,23.5 L 760,28.5 L 748,31 L 740,28 L 728,32.5 L 716,26 L 704,22 L 692,19 L 680,18 L 668,20 L 656,17.5 L 644,19 L 632,22.5 L 620,25.5 L 608,23 L 596,27.5 L 584,24 L 572,20 L 560,19 L 548,21.5 L 536,25.5 L 524,30.5 L 512,35 L 504,31 L 492,36 L 480,31 L 468,26 L 456,22 L 444,19 L 432,18.5 L 420,20 L 408,23.5 L 396,28 L 384,25 L 372,21 L 360,19.5 L 348,18 L 336,20 L 324,23 L 312,28 L 300,31 L 292,27.5 L 280,32 L 268,25 L 256,21 L 244,18 L 232,17 L 220,19 L 208,22.5 L 196,26 L 184,30 L 176,26 L 164,31 L 152,26 L 140,21 L 128,19 L 116,20.5 L 104,18 L 92,20 L 80,23 L 68,19 L 56,21 L 44,18.5 L 32,20 L 20,22.5 L 0,19.5 L 0,8 Z"
            fill="#F9F5EB"
            opacity="0.95"
            filter="url(#postreg-torn)"
          />

          {/* Layer 2: Main Dark Blue Navy Paper */}
          <path
            d="M 1440,0 L 1440,16 L 1422,18.5 L 1410,16.5 L 1395,20 L 1386,17 L 1370,19.5 L 1358,23.5 L 1345,22 L 1334,17 L 1320,16 L 1308,19.5 L 1295,25 L 1282,28.5 L 1275,26 L 1264,29.5 L 1252,24 L 1240,18 L 1228,16.5 L 1215,19 L 1202,15 L 1190,17 L 1178,22 L 1165,26 L 1152,23 L 1140,26.5 L 1132,24 L 1120,19 L 1108,17 L 1095,15.5 L 1082,18 L 1070,16 L 1058,20 L 1045,23 L 1032,18 L 1020,16 L 1008,15 L 995,17.5 L 982,20.5 L 970,25 L 958,30 L 950,27 L 938,32 L 928,28 L 916,23 L 904,19 L 892,16 L 880,15 L 868,17.5 L 856,16 L 844,18 L 832,14.5 L 820,13 L 808,15 L 796,17.5 L 784,16 L 772,20 L 760,24.5 L 748,27.5 L 740,25 L 728,29 L 716,23 L 704,19 L 692,16 L 680,15 L 668,17 L 656,14.5 L 644,16 L 632,19 L 620,22 L 608,20 L 596,23.5 L 584,21 L 572,17 L 560,16 L 548,18.5 L 536,22 L 524,27 L 512,30.5 L 504,27.5 L 492,32.5 L 480,28 L 468,23 L 456,19 L 444,16 L 432,15.5 L 420,17 L 408,20.5 L 396,24.5 L 384,22 L 372,18 L 360,16.5 L 348,15 L 336,17 L 324,19.5 L 312,24.5 L 300,27.5 L 292,24.5 L 280,28.5 L 268,22 L 256,18 L 244,15 L 232,14 L 220,16 L 208,19 L 196,22.5 L 184,26.5 L 176,23 L 164,27.5 L 152,23 L 140,18 L 128,16 L 116,17.5 L 104,15 L 92,17 L 80,19.5 L 68,16 L 56,18 L 44,15.5 L 32,17 L 20,19 L 0,16.5 L 0,0 Z"
            fill="#0A2A5E"
            filter="url(#postreg-torn)"
          />

          {/* Layer 3: Unfiltered Solid Blue Bridge at TOP (drawn LAST on top of everything to guarantee seamless 0-line connection) */}
          <rect x="0" y="0" width="1440" height="12" fill="#0A2A5E" />
        </svg>
      </div>
    </header>
  );
};

export default PostRegNavbar;
