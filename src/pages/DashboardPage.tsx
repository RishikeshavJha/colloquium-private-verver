import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loadPassport, savePassport, emptyPerson, getAuthUser, WHATSAPP_LINK, type Passport } from '../utils/storage';
import { getUserSubmissions, type FirestoreSubmission } from '../lib/db';
import { tracks } from '../data/tracks';
import { useInspireBackground } from '../context/InspireBackgroundContext';
import {
  FileText,
  Upload,
  User,
  Users,
  Clock,
  ExternalLink,
  AlertCircle,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Lock,
  ArrowRight,
  Eye,
  CheckCircle2,
  X,
  CreditCard,
  ShieldCheck,
  BadgeIndianRupee,
  Star,
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
  useInspireBackground('quiet');
  const location = useLocation();
  const [passport, setPassport] = useState<Passport>(() => loadPassport());
  const [_user, setUser] = useState(() => getAuthUser());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [firestoreSubmissions, setFirestoreSubmissions] = useState<(FirestoreSubmission & { id: string })[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (location.state && (location.state as any).submissionSuccess) {
      setShowSuccessToast(true);
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setShowSuccessToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

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
        if (subs && subs.length > 0) {
          const currentP = loadPassport();
          if ((!currentP.abstracts || currentP.abstracts.length === 0) || !currentP.track) {
            currentP.abstracts = currentP.abstracts?.length ? currentP.abstracts : subs.map(s => ({
              id: s.id,
              title: s.problemStatement || s.track,
              track: s.track,
              filename: (s.pptLink && s.pptLink !== 'Abstract Only') ? 'Presentation_File.pdf' : 'Abstract_Only',
              size: 0,
              date: s.createdAtIST || new Date().toLocaleDateString('en-IN')
            }));
            if (!currentP.track && subs[0]?.track) {
              currentP.track = subs[0].track;
            }
            savePassport(currentP);
            setPassport(currentP);
          }
        }
      }).catch(err => {
        console.error("Failed to load firestore submissions", err);
      });
    }

    const pptSubmissionDeadline = new Date('2026-09-30T23:59:59').getTime();
    const evaluationDeadline = new Date('2026-10-01T23:59:59').getTime();
    const paymentDeadline = new Date('2026-10-02T12:00:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const currentPassport = loadPassport();

      let target = pptSubmissionDeadline;
      if (currentPassport.abstracts && currentPassport.abstracts.length > 0) {
        target = evaluationDeadline;
      }
      if (currentPassport.category && currentPassport.abstracts && currentPassport.abstracts.length > 0) {
        // If deadline is after evaluation, target payment deadline
        if (now > evaluationDeadline && now < paymentDeadline) {
          target = paymentDeadline;
        }
      }

      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 10000);
    return () => clearInterval(timer);
  }, []);

  const isUnlocked = !!passport.registered;

  // Render locked screen if registration is not completed
  if (!isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center w-full flex flex-col items-center select-none">
        <div className="bg-[#FFFDF9]/95 rounded-3xl border-2 border-[#C8B89A] p-8 sm:p-12 shadow-2xl relative overflow-hidden backdrop-blur-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-[#0A2A5E] text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
            PORTAL ACCESS LOCKED · REGISTRATION REQUIRED
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">
            Registration Required
          </h2>

          <p className="font-sans text-sm text-[#5A5A7A] max-w-md mx-auto leading-relaxed mb-8">
            The Participant Dashboard, Event Pass, and Submission Portal are available after registration is completed. Please complete your registration to access your dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <span>Complete Registration Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-[#C8B89A]/40">
            <Link to="/" className="text-xs font-semibold text-[#5A5A7A] hover:text-[#0A2A5E]">
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const leader = passport.people[0] || emptyPerson();
  const effectiveTrack = passport.track || (firestoreSubmissions[0]?.track) || '';
  const trackInfo = tracks.find((t) => t.name === effectiveTrack);
  const trackTheme = trackThemeImages[effectiveTrack] || { image: '/themes/ai_ml.jpg', color: '#0A2A5E' };
  const hasSubmitted = Boolean(
    (passport.abstracts && passport.abstracts.length > 0) ||
    firestoreSubmissions.length > 0
  );
  const hasAbstracts = hasSubmitted;

  const selectedSubmission = firestoreSubmissions.find(s => s.evaluationStatus === 'SELECTED');
  const isSelected = Boolean(selectedSubmission);
  const isRejected = !isSelected && firestoreSubmissions.length > 0 && firestoreSubmissions.every(s => s.evaluationStatus === 'REJECTED');
  const payStatus = selectedSubmission?.paymentStatus || 'NOT_PAID';

  // Helper to validate whether a URL points to an actual uploaded file
  const isValidSubmissionFileUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'Abstract Only' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'None' || trimmed === 'N/A') {
      return false;
    }
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:');
  };

  const categoryMeta = {
    UG: {
      title: 'UG / Diploma',
      track: 'Ideathon Track',
      rule: 'Teams of 2 to 4',
      badge: '/ug-category-emblem.jpg',
      color: '#FF6B00',
    },
    PG: {
      title: 'Postgraduate (PG)',
      track: 'Research Track',
      rule: 'Solo Participation',
      badge: '/pg-category-emblem.jpg',
      color: '#0A2A5E',
    },
    PPG: {
      title: 'Post-PG / PhD',
      track: 'Research Track',
      rule: 'Solo Participation',
      badge: '/ppg-category-emblem.jpg',
      color: '#138808',
    },
  }[(passport.category as 'UG' | 'PG' | 'PPG')] || {
    title: passport.category || 'Not Selected',
    track: 'Open Track',
    rule: 'Participation',
    badge: '/ug-category-emblem.jpg',
    color: '#0A2A5E',
  };


  const isRegistered = !!passport.category && (passport.registered || !!leader.name);

  const registrationId = `INSPIRE-2026-${(passport.team || leader.name || 'PASS')
    .slice(0, 3)
    .toUpperCase()}-${Math.abs(
    (leader.email || 'slrtce').split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)
  )
    .toString()
    .slice(0, 4)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 relative w-full">

      {/* Submission Success Toast Modal */}
      {showSuccessToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#FFFDF9] border-2 border-[#138808] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center flex flex-col items-center transform transition-all scale-100">
            <button
              onClick={() => setShowSuccessToast(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#138808] flex items-center justify-center shadow-inner relative z-10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-100 text-[#138808] font-bold text-xs rounded-full uppercase tracking-wider mb-2">
              Success
            </span>

            <h3 className="font-display text-2xl font-black text-[#0A2A5E] mb-2">
              Submission Received!
            </h3>

            <p className="font-sans text-sm text-[#5A5A7A] mb-6 leading-relaxed">
              Your submission has been received. Kindly wait while we evaluate it.
            </p>

            <button
              onClick={() => setShowSuccessToast(false)}
              className="w-full bg-[#138808] hover:bg-[#0f6b06] text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* Top Banner Alert if Registration Incomplete */}
      {!isRegistered && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-900 font-medium">
              Registration incomplete. Complete your registration to get your official Event Pass.
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
        <div className="bg-[#FAF6EE]/90 backdrop-blur-[2px] p-3 sm:p-4 rounded-2xl border border-[#C8B89A]/30 w-fit">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
            <Sparkles className="w-3 h-3 text-[#FF6B00]" />
            PARTICIPANT DASHBOARD
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-4xl font-extrabold text-[#0A2A5E]">
            Welcome, {leader.name || 'INSPIRE Participant'}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5A7A] mt-1 font-medium">
            {passport.team ? `Team: ${passport.team} • ` : ''}
            {leader.institution || 'IEEE SLRTCE Student Branch'}
          </p>
        </div>

        {/* Right Section: Customized Submission Deadline Countdown Timer + Quick Action Buttons */}
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
          {/* Compact Premium Deadline Countdown Widget */}
          <div className="bg-[#FAF6EE]/90 backdrop-blur-md border border-[#C8B89A]/80 shadow-sm rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 pl-1">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isSelected ? 'bg-[#FF6B00] text-white' : 'bg-[#0A2A5E] text-amber-400'}`}>
                {isSelected ? <Star className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#0A2A5E]">
                    {isSelected && payStatus === 'NOT_PAID'
                      ? 'Payment Deadline (Oct 2, 12 PM)'
                      : hasSubmitted
                      ? 'Evaluation Window (Ends Oct 1)'
                      : 'SUBMISSION (DEADLINE SEPT 30)'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[#FF6B00]" />
                </div>
                <span className="text-[9px] font-semibold text-[#5A5A7A]">
                  {isSelected && payStatus === 'NOT_PAID'
                    ? 'Confirm slot before 12:00 PM'
                    : hasSubmitted
                    ? 'Evaluation till 1st Oct 11:59 PM'
                    : 'Submit before 30th Sept 11:59 PM'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0A2A5E] px-3 py-1.5 rounded-xl border border-[#0A2A5E] shadow-inner text-white">
              <div className="flex items-baseline gap-0.5">
                <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-gray-300 uppercase">d</span>
              </div>
              <span className="text-amber-400/80 font-bold text-xs font-mono">:</span>
              <div className="flex items-baseline gap-0.5">
                <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-gray-300 uppercase">h</span>
              </div>
              <span className="text-amber-400/80 font-bold text-xs font-mono">:</span>
              <div className="flex items-baseline gap-0.5">
                <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-bold text-gray-300 uppercase">m</span>
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Link
              to="/submit"
              className="inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white text-xs font-bold px-4 py-3 sm:py-2.5 rounded-xl shadow-md transition-all active:scale-95 min-h-[44px]"
            >
              {hasSubmitted ? <Eye className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{hasSubmitted ? 'View Submission' : 'Attach Your Submission'}</span>
            </Link>
            {!hasSubmitted && (
              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-[#C8B89A] text-[#0A2A5E] text-xs font-bold px-3.5 py-3 sm:py-2.5 rounded-xl shadow-sm transition-all min-h-[44px]"
              >
                <User className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Link>
            )}
            <Link
              to="/community"
              className="inline-flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] text-xs font-bold px-3.5 py-3 sm:py-2.5 rounded-xl transition-all min-h-[44px]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Channel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Status Cards with Image Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 mb-8 sm:mb-10">
            {/* Card 1: Category */}
            <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Category</span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${categoryMeta.color}15`, color: categoryMeta.color }}
                >
                  {categoryMeta.track}
                </span>
              </div>

              <div className="flex items-center gap-2.5 my-1">
                <img
                  src={categoryMeta.badge}
                  alt={categoryMeta.title}
                  className="w-10 h-10 rounded-full object-contain border border-[#C8B89A] shrink-0 shadow-xs bg-white p-0.5"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#0A2A5E] line-clamp-1">
                    {categoryMeta.title}
                  </h4>
                  <span className="text-[11px] text-[#5A5A7A] block line-clamp-1">
                    {categoryMeta.rule}
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-[#C8B89A]/30 text-[10px] text-gray-600 font-mono flex items-center justify-between">
                <span className="truncate max-w-[125px]">{registrationId}</span>
                <Link
                  to="/profile"
                  className="text-[#FF6B00] font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

        {/* Card 2: Research Track with Theme Image (Only when selected) */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Track Domain</span>
            {effectiveTrack && (
              <span
                className="w-3 h-3 rounded-full shadow-sm shrink-0"
                style={{ backgroundColor: trackInfo?.color || '#0A2A5E' }}
              />
            )}
          </div>

          {effectiveTrack ? (
            <>
              <div className="flex items-center gap-2.5 my-1">
                <img
                  src={trackTheme.image}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-[#C8B89A] shrink-0 shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#0A2A5E] line-clamp-1">
                    {effectiveTrack}
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
                  Select your research theme during submission
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Evaluation Status</span>
            {isSelected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : isRejected ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#0A2A5E]">
              {isSelected
                ? 'Selected for Presentation'
                : isRejected
                ? 'Not Shortlisted'
                : hasSubmitted
                ? 'Under Evaluation'
                : 'Pending Submission'}
            </h4>
            <span className="text-xs text-[#5A5A7A] mt-1 block">
              {isSelected
                ? 'Shortlisted for Colloquium Presentation!'
                : isRejected
                ? 'Evaluation completed by panel'
                : hasSubmitted
                ? 'Submission under committee evaluation'
                : 'Upload submission before deadline'}
            </span>
          </div>
          <Link
            to="/submit"
            className="mt-4 pt-3 border-t border-[#C8B89A]/30 text-[11px] font-bold text-[#FF6B00] hover:underline inline-flex items-center gap-1"
          >
            <span>{hasSubmitted ? 'View Submission' : 'Submit'}</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 4: Delegation / Individual Strength */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {passport.category === 'UG' ? 'Team Participation' : 'Solo Participation'}
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
                  {passport.people.length < 2 && (
                    <span className="block text-[10px] font-sans font-bold text-red-600 mt-0.5">
                      ⚠️ Incomplete Team (Min 2 required)
                    </span>
                  )}
                </>
              ) : (
                <>
                  1 <span className="text-xs font-sans font-normal text-gray-500">(Solo Participation)</span>
                </>
              )}
            </h4>
            <span className="text-xs text-[#5A5A7A] mt-1 block truncate">
              {passport.category === 'UG' ? `Leader: ${leader.name || 'Not set'}` : `Participant: ${leader.name || 'Not set'}`}
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
              Individual Tier • Solo Participation
            </div>
          )}
        </div>
      </div>



      {/* Shortlist Selection & Payment Confirmation Banner Card */}
      {isSelected && (
        <div className="mb-8 bg-[#FFFDF9] border-2 border-[#138808] rounded-2xl p-5 sm:p-7 shadow-xl relative overflow-hidden backdrop-blur-sm">
          {/* Top Decorative Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-[#138808] to-emerald-600" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 pb-5 border-b border-emerald-900/10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                SHORTLISTED · PAYMENT & SLOT CONFIRMATION
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-[#0A2A5E]">
                Registration Fee & Presentation Slot Confirmation
              </h2>
              <p className="text-xs sm:text-sm text-[#5A5A7A] max-w-2xl leading-relaxed">
                🎉 Congratulations! Your project has been selected for the INSPIRE Colloquium 2026. Complete payment below to confirm your presentation slot.
              </p>
            </div>

            {/* Status Pill */}
            <div className="shrink-0">
              {payStatus === 'PAID' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 border-2 border-emerald-400 font-bold text-xs uppercase tracking-wider shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Fee Verified & Slot Confirmed
                </span>
              ) : payStatus === 'UNDER_REVIEW' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-100 text-blue-900 border-2 border-blue-300 font-bold text-xs uppercase tracking-wider shadow-sm animate-pulse">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Payment Under Verification
                </span>
              ) : payStatus === 'FAILED' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-100 text-rose-900 border-2 border-rose-400 font-bold text-xs uppercase tracking-wider shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-700" />
                  Verification Issue · Contact Admin
                </span>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-950 border-2 border-amber-400 font-bold text-xs uppercase tracking-wider shadow-sm">
                  <Clock className="w-4 h-4 text-amber-700 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>Payment Pending</span>
                  <span className="w-px h-3.5 bg-amber-400/70" />
                  <span className="font-mono text-xs font-black text-amber-900 tracking-wider">
                    {String(timeLeft.days).padStart(2, '0')}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Card Body */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {/* Left 2 Cols: Details */}
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Pass ID</span>
                  <span className="font-mono font-bold text-[#0A2A5E]">{registrationId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Category</span>
                  <span className="font-bold text-[#FF6B00]">{passport.category === 'UG' ? 'UG / Diploma' : passport.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Selected Track</span>
                  <span className="font-bold text-[#0A2A5E] truncate block">{effectiveTrack || 'Ideathon Track'}</span>
                </div>
              </div>

              {payStatus === 'UNDER_REVIEW' && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-bold block mb-0.5">Payment Under Verification</strong>
                    Your payment proof has been received. The organizing team will verify your transaction and confirm your slot within 24–48 hours. We'll notify you via email.
                  </div>
                </div>
              )}
              {payStatus === 'NOT_PAID' && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border-2 border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="font-bold text-amber-950 block mb-0.5">⏰ Action Required: Complete Payment Before 2nd Oct, 12:00 PM (Afternoon)</strong>
                      Pay the registration fee via UPI or bank transfer and submit your transaction ID + screenshot. <span className="font-bold text-rose-700">Slots not confirmed before Oct 2nd 12:00 PM may be reallocated.</span>
                    </div>
                  </div>

                  {/* Live Payment Timer Countdown */}
                  <div className="shrink-0 flex items-center gap-1.5 bg-[#0A2A5E] px-3 py-1.5 rounded-xl border border-amber-400/40 text-white shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-mono text-sm font-black text-amber-300">
                        {String(timeLeft.days).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 uppercase">d</span>
                    </div>
                    <span className="text-amber-400/80 font-bold text-xs font-mono">:</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-mono text-sm font-black text-amber-300">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 uppercase">h</span>
                    </div>
                    <span className="text-amber-400/80 font-bold text-xs font-mono">:</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-mono text-sm font-black text-amber-300">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 uppercase">m</span>
                    </div>
                  </div>
                </div>
              )}
              {payStatus === 'PAID' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-bold block mb-0.5">Payment Verified & Slot Confirmed!</strong>
                    Your registration fee has been verified. Your presentation slot is officially confirmed. See you at INSPIRE Colloquium 2026!
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Action Button */}
            <div className="p-4 rounded-xl bg-white border-2 border-[#C8B89A] flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                payStatus === 'PAID' ? 'bg-emerald-100 text-[#138808]' :
                payStatus === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                payStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                'bg-emerald-100 text-[#138808]'
              }`}>
                {payStatus === 'PAID' ? <ShieldCheck className="w-6 h-6" /> :
                 payStatus === 'UNDER_REVIEW' ? <Clock className="w-6 h-6" /> :
                 payStatus === 'FAILED' ? <AlertCircle className="w-6 h-6" /> :
                 <BadgeIndianRupee className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold text-[#0A2A5E] block">Registration Fee</span>
                <span className="text-[10px] text-gray-500">
                  {payStatus === 'PAID' ? 'Confirmed & verified' :
                   payStatus === 'UNDER_REVIEW' ? 'Verification in progress' :
                   payStatus === 'FAILED' ? 'Contact organiser' :
                   'Submit your payment proof'}
                </span>
              </div>
              {payStatus === 'NOT_PAID' && (
                <Link
                  to="/payment"
                  className="w-full py-2.5 px-3 rounded-xl bg-[#138808] hover:bg-[#0e6806] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay & Submit Proof</span>
                </Link>
              )}
              {payStatus === 'UNDER_REVIEW' && (
                <span className="w-full py-2.5 px-3 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200">
                  <Clock className="w-3.5 h-3.5" /> Under Verification
                </span>
              )}
              {payStatus === 'PAID' && (
                <span className="w-full py-2.5 px-3 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Slot Confirmed
                </span>
              )}
              {payStatus === 'FAILED' && (
                <a
                  href="mailto:colloquium.ieee@slrtce.in"
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-300 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Contact Organiser
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid: Roadmap + Passport Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
        {/* Left 2 Cols: Event Journey Roadmap */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#C8B89A]/50 pb-3 sm:pb-4 mb-4 sm:mb-6 gap-2">
              <div>
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">Conference Roadmap</span>
                <h3 className="font-display text-lg sm:text-2xl font-bold text-[#0A2A5E]">
                  Your INSPIRE Colloquium 2026 Journey
                </h3>
              </div>
              {isSelected ? (
                <span className="text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selected for Colloquium Presentation
                </span>
              ) : isRejected ? (
                <span className="text-xs font-bold text-rose-900 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Evaluation Complete: Not Shortlisted
                </span>
              ) : hasSubmitted ? (
                <span className="text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" /> Stage 2 In Progress: Under Evaluation
                </span>
              ) : (
                <span className="text-xs font-bold text-[#138808] bg-[#138808]/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Stage 1 In Progress
                </span>
              )}
            </div>

            {/* Stages Stack */}
            <div className="space-y-4">
              {/* Stage 1 */}
              {hasSubmitted ? (
                <div className="p-3 sm:p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Abstract Submission & Editorial Check</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Submitted ✓
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Abstract received and verified in conference system.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/submit"
                    className="self-start shrink-0 text-xs font-bold px-3 py-2 sm:py-1.5 rounded-lg bg-[#0A2A5E] hover:bg-[#1E3E72] text-white transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5"
                  >
                    <span>View Submission Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="p-3 sm:p-4 rounded-xl border-2 border-[#0A2A5E] bg-white shadow-sm flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A2A5E] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Abstract Submission & Editorial Check</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-800">
                          Active Now
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Submit a concise 150–250 word abstract highlighting your research, idea, or proposed work.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/submit"
                    className="self-start shrink-0 text-xs font-bold px-3 py-2 sm:py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#E65A00] text-white transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center justify-center"
                  >
                    Upload Submission
                  </Link>
                </div>
              )}

              {/* Stage 2 */}
              {isSelected ? (
                <div className="p-3 sm:p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Evaluation</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Evaluation Completed ✓
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Review panel has evaluated your submission and selected your project.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-100/80 px-3 py-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Evaluation complete. Shortlisted for colloquium presentation!</span>
                  </div>
                </div>
              ) : isRejected ? (
                <div className="p-3 sm:p-4 rounded-xl border border-rose-300 bg-rose-50/50 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Evaluation</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                          Completed · Not Shortlisted
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Review panel has completed evaluation for this cycle.
                      </p>
                    </div>
                  </div>
                </div>
              ) : hasSubmitted ? (
                <div className="p-3 sm:p-4 rounded-xl border-2 border-[#0A2A5E] bg-white shadow-md flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A2A5E] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Evaluation</h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold animate-pulse">
                          Active Now · Under Evaluation
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Review panel is currently evaluating submissions based on problem statement, novelty, and clarity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50/90 px-3 py-2 rounded-lg border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>Evaluation in progress. Shortlist announcements will unlock in Stage 3.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Evaluation</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          Upcoming
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Review panel evaluates submissions based on problem statement, novelty, and clarity.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 italic">Timeline: Stage 2</span>
                </div>
              )}

              {/* Stage 3 */}
              {isSelected ? (
                <div className="p-3 sm:p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 shadow-md flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Shortlist Results</h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black tracking-wide uppercase">
                          SELECTED FOR COLLOQUIUM PRESENTATION
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 mt-1.5 font-medium leading-relaxed">
                        🎉 Congratulations! Your project abstract/presentation has been officially shortlisted and selected for the INSPIRE Colloquium 2026 presentation round.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Slot Reserved
                    </span>
                    <Link
                      to="/submit"
                      className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      View Selection Details →
                    </Link>
                  </div>
                </div>
              ) : isRejected ? (
                <div className="p-3 sm:p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Shortlist Results</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Not Shortlisted
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Evaluation completed. Unfortunately, your project was not shortlisted for presentation in this edition.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Shortlist Results</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          Upcoming
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Announcement of shortlisted teams and participants selected for presentation.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 italic">Unlocks after Evaluation</span>
                </div>
              )}

              {/* Stage 4 */}
              {isSelected ? (
                <div className="p-3 sm:p-4 rounded-xl border-2 border-[#0A2A5E] bg-white shadow-md flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A2A5E] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Slot Confirmation & Verification</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">
                          Active Now · Unlocked
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1 leading-relaxed">
                        Selected participants must complete the registration fee payment and submit proof within <span className="font-bold text-rose-600">24 hours of selection</span>. Slots not confirmed within this window may be reallocated to the next shortlisted team.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    ✓ Unlocked for Shortlisted Participant
                  </span>
                </div>
              ) : (
                <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0A2A5E]">Payments (Deadline)</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          Pending Shortlist
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5A7A] mt-1">
                        Shortlisted participants complete the registration fee payment before the deadline to confirm their slot.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 italic">Unlocks after Shortlist</span>
                </div>
              )}

              {/* Stage 5 */}
              <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2A5E]">Main Event</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Colloquium Day
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A7A] mt-1">
                      Live project presentation and defense before jury panels and attendees at SLRTCE Campus.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">Offline Presentation & Defense</span>
              </div>

              {/* Stage 6 */}
              <div className="p-3 sm:p-4 rounded-xl border border-[#C8B89A] bg-[#FAF6EE] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    6
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0A2A5E]">Valedictory</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Grand Finale
                      </span>
                    </div>
                    <p className="text-xs text-[#5A5A7A] mt-1">
                      Closing ceremony, winner announcements, awards distribution, and official IEEE citation certificates.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 italic">Awards & Closing Ceremony</span>
              </div>
            </div>
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
                <span className="text-[10px] text-gray-400 uppercase font-bold block">
                  {passport.category === 'UG' ? 'Team Leader' : 'Participant'}
                </span>
                <span className="font-bold text-[#0A2A5E]">{leader.name || 'Participant'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Category</span>
                <span className="font-bold text-[#FF6B00]">{passport.category === 'UG' ? 'UG / Diploma' : passport.category || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">College / Institute</span>
                <span className="font-bold text-[#0A2A5E]">{leader.institution || 'SLRTCE'}</span>
              </div>
              {passport.team && (
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Team Name</span>
                  <span className="font-bold text-[#0A2A5E]">{passport.team}</span>
                </div>
              )}
            </div>

            {!hasSubmitted && (
              <Link
                to="/profile"
                className="mt-4 w-full py-2.5 rounded-lg bg-[#FAF6EE] hover:bg-[#FAF0DB] border border-[#C8B89A] text-[#0A2A5E] text-xs font-bold text-center inline-flex items-center justify-center transition-colors min-h-[44px]"
              >
                Edit Profile Details →
              </Link>
            )}
          </div>

          {/* Team / Participant Directory Card */}
          <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <h4 className="font-display text-sm font-bold text-[#0A2A5E] uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>{passport.category === 'UG' ? 'Team Members' : 'Participant Profile'}</span>
              <span className="text-xs font-mono font-normal text-gray-500">
                {passport.category === 'UG' ? `${passport.people.length} Member(s)` : '1 Member (Solo)'}
              </span>
            </h4>

            <div className="space-y-2.5">
              {passport.people.map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#C8B89A]/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0A2A5E]">{p.name || `Member ${idx + 1}`}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {passport.category === 'UG' ? (idx === 0 ? 'Team Leader' : 'Team Member') : 'Solo Participant'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block truncate">{p.email || 'No email provided'}</span>
                </div>
              ))}
            </div>

            {passport.category === 'UG' && !hasSubmitted && (
              <Link
                to="/profile"
                className="mt-3 text-[11px] font-bold text-[#FF6B00] hover:underline inline-flex items-center justify-center w-full min-h-[44px]"
              >
                + Add / Edit Participants
              </Link>
            )}
          </div>

          {/* WhatsApp Card Callout */}
          <div className="bg-[#25D366]/10 border-2 border-[#25D366]/30 rounded-2xl p-4 sm:p-5 text-center">
            <MessageCircle className="w-8 h-8 text-[#25D366] mx-auto mb-2" />
            <h4 className="font-bold text-sm text-[#0A2A5E]">Official WhatsApp Channel</h4>
            <p className="text-[11px] text-[#5A5A7A] mt-1 mb-3">
              Scan the QR or click below to join the official WhatsApp Channel for real-time track updates.
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
