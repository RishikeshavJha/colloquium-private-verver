import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadPassport, savePassport, emptyPerson, getAuthUser, WHATSAPP_LINK, type Passport } from '../utils/storage';
import { getUserSubmissions, type FirestoreSubmission } from '../lib/db';
import { tracks } from '../data/tracks';
import {
  FileText,
  Upload,
  User,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Lock,
  ArrowRight,
} from 'lucide-react';

const trackThemeImages: Record<string, { image: string; color: string }> = {
  'AI & Machine Learning': { image: '/themes/ai_ml.jpg', color: '#1E3A8A' },
  'Internet of Things': { image: '/themes/iot.jpg', color: '#0F172A' },
  'Healthcare & MedTech': { image: '/themes/health.jpg', color: '#9F1239' },
  'Sustainability & Green Technology': { image: '/themes/sustainability.jpg', color: '#138808' },
  'Cybersecurity & Digital Trust': { image: '/themes/cybersecurity.jpg', color: '#1E40AF' },
  'Automation': { image: '/themes/automation.jpg', color: '#FF6B00' },
  'FinTech': { image: '/themes/fintech.jpg', color: '#D97706' },
  'Blockchain': { image: '/themes/blockchain.jpg', color: '#2563EB' },
  'Emerging Technologies': { image: '/themes/emerging.jpg', color: '#5B21B6' },
};

export const DashboardPage: React.FC = () => {
  const [passport, setPassport] = useState<Passport>(() => loadPassport());
  const [user, setUser] = useState(() => getAuthUser());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [firestoreSubmissions, setFirestoreSubmissions] = useState<(FirestoreSubmission & { id: string })[]>([]);

  useEffect(() => {
    const p = loadPassport();
    // If no abstracts have been submitted yet, track is pending selection
    if (p.track && (!p.abstracts || p.abstracts.length === 0)) {
      p.track = '';
      savePassport(p);
    }
    setPassport(p);
    const currentUser = getAuthUser();
    setUser(currentUser);

    if (currentUser?.id) {
      getUserSubmissions(currentUser.id).then((subs) => {
        setFirestoreSubmissions(subs);
      }).catch(err => {
        console.error("Failed to load firestore submissions", err);
      });
    }

    // Conference Date: October 3, 2026 at 9:00 AM IST (from Landing Page)
    const targetDate = new Date('2026-10-03T09:00:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 60000);
    return () => clearInterval(timer);
  }, []);

  const isUnlocked = !!user || !!passport.registered;

  // Render locked screen if neither logged in nor registered
  if (!isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border-2 border-[#C8B89A] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#0A2A5E] text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
            PORTAL ACCESS LOCKED
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">
            Registration Required
          </h2>

          <p className="font-sans text-sm text-[#5A5A7A] max-w-md mx-auto leading-relaxed mb-8">
            The Participant Dashboard, Innovation Passport, and Abstract Submission Portal are locked for first-time delegates. Please complete your registration to unlock your team portal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <span>Complete Registration Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FAF6EE] hover:bg-white text-[#0A2A5E] border-2 border-[#C8B89A] text-sm font-bold px-6 py-3 rounded-xl transition-all"
            >
              <span>Existing User? Sign In</span>
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-[#C8B89A]/40">
            <Link to="/" className="text-xs font-semibold text-[#5A5A7A] hover:text-[#0A2A5E]">
              ← Return to Conclave Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const leader = passport.people[0] || emptyPerson();
  const trackInfo = tracks.find((t) => t.name === passport.track);
  const trackTheme = trackThemeImages[passport.track] || { image: '/themes/ai_ml.jpg', color: '#0A2A5E' };
  const hasAbstracts = passport.abstracts && passport.abstracts.length > 0;

  const isRegistered = !!passport.category && (passport.registered || !!leader.name);

  const registrationId = `VIKAS-2026-${(passport.team || leader.name || 'PASS')
    .slice(0, 3)
    .toUpperCase()}-${Math.abs(
    (leader.email || 'slrtce').split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)
  )
    .toString()
    .slice(0, 4)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 relative">
      {/* Background Watermark */}
      <div className="absolute top-8 right-8 pointer-events-none opacity-10 select-none hidden lg:block">
        <img
          src="/apj-abdul-kalam-transparent.png"
          alt="Dr. APJ Abdul Kalam"
          className="w-80 h-auto object-contain"
        />
      </div>

      {/* Top Banner Alert if Registration Incomplete */}
      {!isRegistered && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-900 font-medium">
              Registration incomplete. Complete your delegate profile to lock your Innovation Passport.
            </span>
          </div>
          <Link
            to="/register"
            className="text-xs font-bold text-amber-900 underline flex items-center gap-1"
          >
            <span>Finish Now</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Dashboard Top Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
            <Sparkles className="w-3 h-3 text-[#FF6B00]" />
            PARTICIPANT COMMAND CENTRE
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-4xl font-extrabold text-[#0A2A5E]">
            Welcome, {leader.name || 'VIKAS Innovator'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5A7A] mt-1">
            {passport.team ? `Delegation: ${passport.team} • ` : ''}
            {leader.institution || 'IEEE SLRTCE Student Branch'}
          </p>
        </div>

        {/* Right Section: Conference Countdown Timer (from landing page) + Quick Action Buttons */}
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
          {/* Tricolor Timer Bar (Matches Landing Page Hero) */}
          <div className="flex flex-col w-full max-w-full sm:max-w-[320px]">
            <div className="flex h-8 sm:h-9 w-full rounded-full overflow-hidden shadow-md border border-[#C8B89A]/60">
              <div className="bg-[#FF9933] flex-1 flex items-center justify-center text-xs sm:text-sm font-bold text-white tracking-wide">
                {timeLeft.days} D
              </div>
              <div className="bg-white flex-1 flex items-center justify-center text-xs sm:text-sm font-bold text-[#0A2A5E] tracking-wide">
                {timeLeft.hours} H
              </div>
              <div className="bg-[#138808] flex-1 flex items-center justify-center text-xs sm:text-sm font-bold text-white tracking-wide">
                {timeLeft.minutes} M
              </div>
            </div>
            <div className="flex w-full mt-1">
              <div className="flex-1 text-center text-[10px] sm:text-[11px] font-bold text-[#0A2A5E]/80 uppercase tracking-wider pr-1">Days</div>
              <div className="flex-1 text-center text-[10px] sm:text-[11px] font-bold text-[#0A2A5E]/80 uppercase tracking-wider px-1">Hours</div>
              <div className="flex-1 text-center text-[10px] sm:text-[11px] font-bold text-[#0A2A5E]/80 uppercase tracking-wider pl-1">Mins</div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Link
              to="/submit"
              className="inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white text-xs font-bold px-4 py-3 sm:py-2.5 rounded-xl shadow-md transition-all active:scale-95 min-h-[44px]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{hasAbstracts ? 'View / Update PPT' : 'Attach Your PPT'}</span>
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-[#C8B89A] text-[#0A2A5E] text-xs font-bold px-3.5 py-3 sm:py-2.5 rounded-xl shadow-sm transition-all min-h-[44px]"
            >
              <User className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </Link>
            <Link
              to="/community"
              className="inline-flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] text-xs font-bold px-3.5 py-3 sm:py-2.5 rounded-xl transition-all min-h-[44px]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Status Cards with Image Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 mb-8 sm:mb-10">
        {/* Card 1: Passport Status */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Innovation Passport</span>
            {isRegistered ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#138808] bg-[#138808]/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Validated
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Draft
              </span>
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#0A2A5E] font-mono tracking-wide">
              {registrationId}
            </h4>
            <span className="text-xs text-[#FF6B00] font-semibold mt-1 block">
              Tier: {passport.category === 'UG' ? 'UG / Diploma' : passport.category || 'Not selected'}
            </span>
          </div>
          <Link
            to={isRegistered ? '/profile' : '/register'}
            className="mt-4 pt-3 border-t border-[#C8B89A]/30 text-[11px] font-bold text-[#0A2A5E] hover:underline inline-flex items-center gap-1"
          >
            <span>{isRegistered ? 'View Stamped Passport' : 'Complete Registration'}</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 2: Research Track with Theme Image (Only when selected) */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Track Domain</span>
            {passport.track && (
              <span
                className="w-3 h-3 rounded-full shadow-sm shrink-0"
                style={{ backgroundColor: trackInfo?.color || '#0A2A5E' }}
              />
            )}
          </div>

          {passport.track ? (
            <>
              <div className="flex items-center gap-2.5 my-1">
                <img
                  src={trackTheme.image}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-[#C8B89A] shrink-0 shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#0A2A5E] line-clamp-1">
                    {passport.track}
                  </h4>
                  <span className="text-[11px] text-[#5A5A7A] block line-clamp-1">
                    {trackInfo?.short || 'Universal'}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#C8B89A]/30 text-[10px] text-gray-600 font-mono flex items-center justify-between">
                <span>SDG: {trackInfo?.sdg || 'Universal'}</span>
                <Link to="/submit" className="text-[#FF6B00] font-bold hover:underline">Change</Link>
              </div>
            </>
          ) : (
            <>
              <div className="my-auto py-1">
                <h4 className="font-bold text-sm text-gray-400 italic">
                  Theme Pending
                </h4>
                <span className="text-[11px] text-[#5A5A7A] block mt-0.5 leading-snug">
                  Select your research theme during abstract submission
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-[#C8B89A]/30 text-[10px] flex items-center justify-between">
                <span className="text-gray-400 font-medium">Unselected</span>
                <Link to="/submit" className="text-[#FF6B00] font-bold hover:underline inline-flex items-center gap-0.5">
                  <span>Select Theme</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Card 3: Abstract Status */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Abstract Review</span>
            <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#0A2A5E]">
              {hasAbstracts ? 'Under Peer Review' : 'Pending Submission'}
            </h4>
            <span className="text-xs text-[#5A5A7A] mt-1 block">
              {hasAbstracts
                ? `${passport.abstracts.length} abstract(s) uploaded`
                : 'Upload PDF format before deadline'}
            </span>
          </div>
          <Link
            to="/submit"
            className="mt-4 pt-3 border-t border-[#C8B89A]/30 text-[11px] font-bold text-[#FF6B00] hover:underline inline-flex items-center gap-1"
          >
            <span>{hasAbstracts ? 'Upload Revised Draft' : 'Submit Abstract'}</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 4: Delegation / Individual Strength */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {passport.category === 'UG' ? 'Team Strength' : 'Participation Mode'}
            </span>
            {passport.category === 'UG' ? (
              <Users className="w-3.5 h-3.5 text-[#0A2A5E]" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#0A2A5E]" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-xl font-display text-[#0A2A5E]">
              {passport.category === 'UG' ? (
                <>
                  {passport.people.length} <span className="text-xs font-sans font-normal text-gray-500">Member(s)</span>
                </>
              ) : (
                <>
                  1 <span className="text-xs font-sans font-normal text-gray-500">Member (Individual Author)</span>
                </>
              )}
            </h4>
            <span className="text-xs text-[#5A5A7A] mt-1 block truncate">
              {passport.category === 'UG' ? `Leader: ${leader.name || 'Not set'}` : `Author: ${leader.name || 'Not set'}`}
            </span>
          </div>
          {passport.category === 'UG' ? (
            <Link
              to="/profile"
              className="mt-4 pt-3 border-t border-[#C8B89A]/30 text-[11px] font-bold text-[#FF6B00] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Team</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <div className="mt-4 pt-3 border-t border-[#C8B89A]/30 text-[11px] font-medium text-gray-400">
              Individual Tier • Solo Entry
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid: Roadmap + Passport Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
        {/* Left 2 Cols: Event Journey Roadmap */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#C8B89A]/50 pb-3 sm:pb-4 mb-4 sm:mb-6 gap-2">
              <div>
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">Conference Roadmap</span>
                <h3 className="font-display text-lg sm:text-2xl font-bold text-[#0A2A5E]">
                  Your VIKAS 2026 Journey
                </h3>
              </div>
              <span className="text-xs font-bold text-[#138808] bg-[#138808]/10 px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Stage 1 In Progress
              </span>
            </div>

            {/* Stages Stack */}
            <div className="space-y-4">
              {/* Stage 1 */}
              <div className="p-3 sm:p-4 rounded-xl border-2 border-[#0A2A5E] bg-white shadow-sm flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0A2A5E] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2A5E]">Abstract Submission & Editorial Check</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-800">
                        {hasAbstracts ? 'Submitted ✓' : 'Active Now'}
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A7A] mt-1">
                      Upload 2-page extended abstract following IEEE double-column template in your selected track.
                    </p>
                  </div>
                </div>
                <Link
                  to="/submit"
                  className="self-start shrink-0 text-xs font-bold px-3 py-2 sm:py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#E65A00] text-white transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center justify-center"
                >
                  {hasAbstracts ? 'View / Re-upload' : 'Upload Abstract'}
                </Link>
              </div>

              {/* Stage 2 */}
              <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2A5E]">Double-Blind Peer Review & Scrutiny</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Upcoming
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A7A] mt-1">
                      Domain panel assesses problem statement novelty, methodology depth, and societal relevance (100 pts criteria).
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">Timeline: Stage 2</span>
              </div>

              {/* Stage 3 */}
              <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2A5E]">Camera-Ready Draft & Presentation Deck</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Locked
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A7A] mt-1">
                      Shortlisted teams receive mentor feedback, prepare PPT slides, and confirm physical/virtual attendance.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">Unlocks after Stage 2</span>
              </div>

              {/* Stage 4 */}
              <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2A5E]">Conclave Grand Presentation & Awards</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Grand Finale
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A7A] mt-1">
                      Live presentation before academic & industry luminaries at SLRTCE Campus with track awards & IEEE citations.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">Final Conclave</span>
              </div>
            </div>
          </div>

          {/* Submission History Section */}
          <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#C8B89A]/50 pb-3 mb-4 gap-2">
              <h3 className="font-display text-lg font-bold text-[#0A2A5E] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FF6B00]" />
                <span>PPT Presentation Submission</span>
              </h3>
              {hasAbstracts ? (
                <span className="text-[11px] font-bold text-[#138808] bg-[#138808]/10 px-2.5 py-1 rounded-full">
                  1 of 1 Submitted (Max Reached)
                </span>
              ) : (
                <Link to="/submit" className="text-xs font-bold text-[#FF6B00] hover:underline">
                  + Submit PPT
                </Link>
              )}
            </div>

            {firestoreSubmissions.length > 0 ? (
              <div className="space-y-3">
                {firestoreSubmissions.map((sub) => {
                  const evalSt = sub.evaluationStatus || 'PENDING';
                  const paySt = sub.paymentStatus || 'NOT_PAID';
                  return (
                    <div
                      key={sub.id}
                      className="p-3 sm:p-4 rounded-xl bg-white border border-[#C8B89A] flex flex-col gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#0A2A5E]">
                            {sub.problemStatement ? (sub.problemStatement.slice(0, 60) + (sub.problemStatement.length > 60 ? '…' : '')) : sub.track}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {evalSt === 'SELECTED' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Selected
                              </span>
                            ) : evalSt === 'REJECTED' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                                ✕ Rejected
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                In Review
                              </span>
                            )}
                            {paySt === 'PAID' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">
                                Fee Verified
                              </span>
                            ) : paySt === 'FAILED' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                                Fee Rejected
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
                                Fee Pending
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-[#5A5A7A] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Track: <strong className="text-[#0A2A5E]">{sub.track}</strong></span>
                          <span>Team: <span className="font-semibold">{sub.teamName}</span></span>
                          <span>Uploaded: {sub.createdAtIST || 'Recorded'}</span>
                        </div>

                        {/* Evaluator Remarks & Teacher Details */}
                        {sub.evaluatorRemarks && (
                          <div className="mt-2.5 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs">
                            <span className="font-bold text-blue-950 block">
                              Teacher Feedback {sub.evaluatedBy ? `(${sub.evaluatedBy})` : ''}:
                            </span>
                            <p className="text-blue-900 mt-0.5 italic leading-relaxed">"{sub.evaluatorRemarks}"</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <span className="text-[11px] text-gray-400 font-mono">
                          Submission ID: {sub.id.slice(0, 8)}…
                        </span>
                        {sub.pptLink && (
                          <a
                            href={sub.pptLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A2A5E] bg-[#FAF6EE] hover:bg-[#F3EAD7] px-3 py-1.5 rounded-lg border border-[#C8B89A] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#FF6B00]" />
                            <span>View Uploaded PPT</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hasAbstracts ? (
              <div className="space-y-3">
                {passport.abstracts.map((abs) => (
                  <div
                    key={abs.id}
                    className="p-3 sm:p-4 rounded-xl bg-white border border-[#C8B89A] flex flex-col gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0A2A5E]">{abs.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          In Review
                        </span>
                      </div>
                      <div className="text-xs text-[#5A5A7A] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Track: <strong className="text-[#0A2A5E]">{abs.track}</strong></span>
                        <span>File: <span className="font-mono">{abs.filename}</span></span>
                        <span>Uploaded: {abs.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-mono">{(abs.size / 1024).toFixed(0)} KB</span>
                      <span className="text-xs font-bold text-[#0A2A5E] bg-[#FAF6EE] px-2.5 py-1 rounded border border-[#C8B89A]">
                        Recorded
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-[#C8B89A] rounded-xl bg-[#FAF6EE]">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#0A2A5E]">No research abstract uploaded yet</p>
                <p className="text-[11px] text-[#5A5A7A] mt-1 max-w-sm mx-auto">
                  Submit your 2-page abstract to enter the peer review process.
                </p>
                <Link
                  to="/submit"
                  className="mt-3 inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-[#FF6B00] hover:bg-[#E65A00] px-4 py-2.5 rounded-lg shadow-sm min-h-[44px]"
                >
                  Upload Abstract Now →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Passport Summary & Team & Community */}
        <div className="space-y-6">
          {/* Digital Passport Card */}
          <div className="bg-white border-2 border-[#0A2A5E] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
              <span className="text-[10px] font-black tracking-widest text-[#0A2A5E] uppercase">
                INNOVATION PASSPORT
              </span>
              <span className="text-[9px] font-mono text-gray-400">{registrationId}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Lead Delegate</span>
                <span className="font-bold text-[#0A2A5E]">{leader.name || 'Delegation Leader'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Category</span>
                <span className="font-bold text-[#FF6B00]">{passport.category === 'UG' ? 'UG / Diploma' : passport.category || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Institution</span>
                <span className="font-bold text-[#0A2A5E]">{leader.institution || 'SLRTCE'}</span>
              </div>
              {passport.category === 'UG' && passport.team && (
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Team Delegation</span>
                  <span className="font-bold text-[#0A2A5E]">{passport.team}</span>
                </div>
              )}
            </div>

            <Link
              to="/profile"
              className="mt-4 w-full py-2.5 rounded-lg bg-[#FAF6EE] hover:bg-[#FAF0DB] border border-[#C8B89A] text-[#0A2A5E] text-xs font-bold text-center inline-flex items-center justify-center transition-colors min-h-[44px]"
            >
              Open Full Passport Editor →
            </Link>
          </div>

          {/* Team / Author Directory Card */}
          <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <h4 className="font-display text-sm font-bold text-[#0A2A5E] uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>{passport.category === 'UG' ? 'Delegation Directory' : 'Author Profile'}</span>
              <span className="text-xs font-mono font-normal text-gray-500">
                {passport.category === 'UG' ? `${passport.people.length} Member(s)` : '1 Member (Individual)'}
              </span>
            </h4>

            <div className="space-y-2.5">
              {passport.people.map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#C8B89A]/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0A2A5E]">{p.name || `Member ${idx + 1}`}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {passport.category === 'UG' ? (idx === 0 ? 'Lead Author' : 'Co-Author') : 'Primary Author'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block truncate">{p.email || 'No email provided'}</span>
                </div>
              ))}
            </div>

            {passport.category === 'UG' && (
              <Link
                to="/profile"
                className="mt-3 text-[11px] font-bold text-[#FF6B00] hover:underline inline-flex items-center justify-center w-full min-h-[44px]"
              >
                + Add / Edit Co-Authors
              </Link>
            )}
          </div>

          {/* WhatsApp Card Callout */}
          <div className="bg-[#25D366]/10 border-2 border-[#25D366]/30 rounded-2xl p-4 sm:p-5 text-center">
            <MessageCircle className="w-8 h-8 text-[#25D366] mx-auto mb-2" />
            <h4 className="font-bold text-sm text-[#0A2A5E]">Official WhatsApp Hub</h4>
            <p className="text-[11px] text-[#5A5A7A] mt-1 mb-3">
              Scan the QR or click below to join the verified participant channel for real-time track updates.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs py-2.5 rounded-lg shadow transition-colors min-h-[44px]"
              >
                <span>Join Channel</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <Link
                to="/community"
                className="text-[11px] font-bold text-[#0A2A5E] hover:underline inline-flex items-center justify-center min-h-[44px]"
              >
                Show QR Code Scanner →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
