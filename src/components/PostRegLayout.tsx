import { Outlet, useLocation } from 'react-router-dom';
import PostRegNavbar from './PostRegNavbar';
import InspireParchmentBackground from './InspireParchmentBackground';
import { InspireBackgroundProvider } from '../context/InspireBackgroundContext';
import { Globe } from 'lucide-react';

const PostRegLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <InspireBackgroundProvider>
      <div className="h-screen flex flex-col bg-[#FAF6EE] font-sans selection:bg-[#FF9933]/30 overflow-hidden">
        {/* Paper texture bg - subtle texture without washing out artwork */}
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-[#FAF6EE] bg-no-repeat bg-center bg-cover opacity-25"
          style={{ backgroundImage: "url('/paper-texture-clean.jpg')" }}
        />

        <PostRegNavbar />

        <main className={`registration-workspace flex-1 relative z-10 flex flex-col items-center justify-start w-full overflow-x-hidden overflow-y-auto ${isAuthPage ? 'p-0 pb-0' : 'pb-4 sm:pb-6'}`}>
          {!isAuthPage && <InspireParchmentBackground />}

          <div className={`relative z-10 w-full flex-1 flex flex-col items-center justify-start ${isAuthPage ? 'h-full min-h-full' : ''}`}>
            <Outlet />
          </div>
        </main>

      {/* Footer */}
      <footer className="w-full text-white relative z-10 font-sans bg-[#0A2A5E] mt-auto overflow-hidden shrink-0">
        {/* Torn paper edge above footer */}
        <div
          className="absolute left-0 w-full max-w-full overflow-hidden pointer-events-none z-30"
          style={{ bottom: 'calc(100% - 2px)' }}
        >
          <svg
            viewBox="0 0 1440 45"
            preserveAspectRatio="none"
            className="w-full h-3 sm:h-3.5 block"
            style={{ filter: 'drop-shadow(0 -2px 3px rgba(10, 42, 94, 0.18))' }}
          >
            <defs>
              <filter id="footer-reg-torn" x="-2%" y="-15%" width="104%" height="150%">
                <feTurbulence type="fractalNoise" baseFrequency="0.14 0.22" numOctaves="5" seed="47" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <path
              d="M 0,45 L 0,26 L 20,23 L 44,27 L 80,22.5 L 128,26.5 L 164,14.5 L 196,19.5 L 232,28.5 L 280,13.5 L 312,17.5 L 348,27.5 L 384,20.5 L 420,25.5 L 456,23.5 L 492,9.5 L 536,20 L 572,25.5 L 608,22.5 L 644,26.5 L 680,27.5 L 716,19.5 L 748,14.5 L 784,26.5 L 820,29.5 L 856,26.5 L 892,26.5 L 938,9.5 L 970,16.5 L 1008,27.5 L 1045,18.5 L 1082,24.5 L 1120,23.5 L 1152,19.5 L 1190,25.5 L 1228,26 L 1264,12 L 1295,16.5 L 1320,26.5 L 1358,18 L 1395,22 L 1422,23.5 L 1440,26 L 1440,45 Z"
              fill="#F8E7BE" opacity="0.95" filter="url(#footer-reg-torn)"
            />
            <path
              d="M 0,45 L 0,29 L 20,26.5 L 44,30 L 80,26 L 128,29 L 164,18 L 196,23 L 232,31 L 280,17 L 312,21 L 348,30 L 384,24 L 420,28 L 456,26.5 L 492,13 L 536,23 L 572,28 L 608,25.5 L 644,29 L 680,30 L 716,23 L 748,18 L 784,29 L 820,32 L 856,29 L 892,29 L 938,13 L 970,20 L 1008,30 L 1045,22 L 1082,27.5 L 1120,26.5 L 1152,23 L 1190,28 L 1228,28.5 L 1264,15.5 L 1295,20 L 1320,29 L 1358,21.5 L 1395,25.5 L 1422,27 L 1440,29 L 1440,45 Z"
              fill="#0A2A5E" filter="url(#footer-reg-torn)"
            />
          </svg>
        </div>

        <div className="w-full px-4 sm:px-8 py-3.5 sm:py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center space-x-3">
                <a
                  href="https://slrtce.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Shree L. R. Tiwari College of Engineering (SLRTCE)"
                  className="transition-transform hover:scale-105"
                >
                  <img src="/slrtce-logo.png" alt="SLRTCE Logo" className="h-8 sm:h-9 w-auto object-contain" />
                </a>
                <div className="h-6 sm:h-7 w-px bg-white/30" />
                <div title="IEEE SLRTCE Student Branch" className="flex items-center">
                  <img src="/ieee-slrtce-logo-white.png" alt="IEEE SLRTCE" className="h-8 sm:h-9 w-auto object-contain" />
                </div>
              </div>
              <p className="text-[11px] sm:text-xs font-bold tracking-wider text-amber-400 uppercase">
                INSPIRE Colloquium 2026
              </p>
            </div>

            <div className="flex flex-col items-center text-center gap-1 text-xs sm:text-sm text-white/80 font-medium">
              <p>&copy; INSPIRE Colloquium 2026 — IEEE SLRTCE STUDENT BRANCH.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {[
                  {
                    label: 'LinkedIn',
                    icon: 'in',
                    url: 'https://in.linkedin.com/company/ieee-slrtce-student-branch',
                  },
                  {
                    label: 'SLRTCE Website',
                    icon: <Globe className="w-4 h-4 sm:w-4 sm:h-4" />,
                    url: 'https://slrtce.in/',
                  },
                  {
                    label: 'Instagram',
                    icon: 'ig',
                    url: 'https://www.instagram.com/ieee.slrtce/',
                  },
                ].map(social => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.label}
                    className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-[#FF6B00] hover:text-white rounded-full cursor-pointer transition-all text-white font-bold text-xs sm:text-xs shadow-sm"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </InspireBackgroundProvider>
);
};

export default PostRegLayout;
