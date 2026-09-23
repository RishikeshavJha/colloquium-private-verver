import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadPassport, savePassport, emptyPerson, validatePerson, yearOptionsFor, getAuthUser, setAuthUser, type Passport, type Person } from '../utils/storage';
import { updateUserProfile } from '../lib/db';
import { tracks } from '../data/tracks';
import {
  Save,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  Lock,
  ArrowRight,
  AlertCircle,
  Users,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [passport, setPassport] = useState<Passport>(() => loadPassport());
  const [_user, setUser] = useState(() => getAuthUser());
  const [toast, setToast] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  useEffect(() => {
    setPassport(loadPassport());
    setUser(getAuthUser());
  }, []);

  const isUnlocked = !!passport.registered;

  if (!isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border-2 border-[#C8B89A] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#0A2A5E] text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
            PROFILE ACCESS LOCKED
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">
            Registration Required
          </h2>

          <p className="font-sans text-sm text-[#5A5A7A] max-w-md mx-auto leading-relaxed mb-8">
            Profile editing is available after registration. Please register first to view and edit your profile details.
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
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const toTitleCase = (val: string) => {
    return val.replace(/(^|\s)\S/g, (char) => char.toUpperCase());
  };

  const handleLeaderChange = (field: keyof Person, val: string) => {
    const formatted = field === 'name' ? toTitleCase(val) : val;
    setPassport((prev) => {
      const leader = { ...prev.people[0], [field]: formatted };
      const people = [leader, ...prev.people.slice(1)];
      return { ...prev, people };
    });
  };

  const handleMemberChange = (idx: number, field: keyof Person, val: string) => {
    const formatted = field === 'name' ? toTitleCase(val) : val;
    setPassport((prev) => {
      const copy = [...prev.people];
      copy[idx] = { ...copy[idx], [field]: formatted };
      return { ...prev, people: copy };
    });
    const errKey = `member_${idx}_${field}`;
    if (profileErrors[errKey]) {
      setProfileErrors((prev) => {
        const copy = { ...prev };
        delete copy[errKey];
        return copy;
      });
    }
  };

  const addMember = () => {
    if (passport.people.length >= 4) return;
    const l = passport.people[0];
    setPassport((prev) => ({
      ...prev,
      people: [
        ...prev.people,
        {
          ...emptyPerson(),
          institution: l?.institution || '',
          department: l?.department || '',
          year: l?.year || '',
        },
      ],
    }));
  };

  const removeMember = (idx: number) => {
    if (passport.category === 'UG' && passport.people.length <= 2) {
      setProfileErrors((prev) => ({
        ...prev,
        team_min: 'UG / Diploma teams require at least 2 members. You cannot remove the only teammate. Edit their details instead.',
      }));
      setShowErrorBanner(true);
      return;
    }
    if (passport.people.length <= 1) return;
    setPassport((prev) => ({
      ...prev,
      people: prev.people.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    const leaderPerson = passport.people[0] || emptyPerson();
    const leaderErrs = validatePerson(leaderPerson);
    Object.entries(leaderErrs).forEach(([field, msg]) => {
      errs[`leader_${field}`] = msg;
    });

    if (passport.category === 'UG' && !passport.team?.trim()) {
      errs['team'] = 'Team Name is required for UG / Diploma entries.';
    }

    if (passport.category === 'UG' && passport.people.length < 2) {
      errs['team_min'] = 'UG / Diploma teams require at least 2 members (1 leader + at least 1 teammate). Please add at least 1 teammate.';
    }

    passport.people.slice(1).forEach((member, idx) => {
      const mErrs = validatePerson(member);
      Object.entries(mErrs).forEach(([field, msg]) => {
        errs[`member_${idx + 1}_${field}`] = `Member ${idx + 2}: ${msg}`;
      });
    });

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      setShowErrorBanner(true);
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setProfileErrors({});
    setShowErrorBanner(false);

    savePassport(passport);

    // Sync authUser so navbar and dashboard display the updated legal name
    const currentAuth = getAuthUser();
    if (currentAuth && leaderPerson.name.trim()) {
      setAuthUser({
        ...currentAuth,
        name: leaderPerson.name.trim(),
        email: leaderPerson.email.trim().toLowerCase() || currentAuth.email,
      });

      // Also update Firestore doc if signed in
      updateUserProfile(currentAuth.id, {
        name: leaderPerson.name.trim(),
        email: leaderPerson.email.trim().toLowerCase() || currentAuth.email,
        phoneNumber: leaderPerson.mobile,
        college: leaderPerson.institution,
        branch: leaderPerson.department,
        year: leaderPerson.year,
        linkedinProfileUrl: leaderPerson.linkedin,
        teamName: passport.team || '',
      }).catch(err => console.error('Failed to sync profile to Firestore:', err));
    }

    setToast(true);
    setTimeout(() => setToast(false), 3500);
  };

  const leader = passport.people[0] || emptyPerson();

  const registrationId = `VIKAS-2026-${(passport.team || leader.name || 'PASS')
    .slice(0, 3)
    .toUpperCase()}-${Math.abs(
    (leader.email || 'slrtce').split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)
  )
    .toString()
    .slice(0, 4)}`;

  const trackInfo = tracks.find((t) => t.name === passport.track);
  const hasSubmitted = Boolean(passport.abstracts && passport.abstracts.length > 0);

  const renderMemberIDCard = (person: Person, idx: number) => {
    const isLeader = idx === 0;
    const cardPassId = isLeader ? registrationId : `${registrationId}-M${idx + 1}`;

    return (
      <div key={idx} className="bg-white border-4 border-[#0A2A5E] rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between text-left">
        {/* Passport Header */}
        <div>
          <div className="flex items-center gap-2.5 border-b border-gray-200 pb-3 mb-4">
            <img src="/slrtce-logo.png" alt="SLRTCE" className="h-7 w-auto object-contain" />
            <div className="h-6 w-px bg-gray-300" />
            <img src="/ieee-slrtce-logo.png" alt="IEEE" className="h-7 w-auto object-contain" />
            <div className="ml-auto text-right">
              <span className="text-[9px] font-mono text-gray-400 uppercase block">Pass ID</span>
              <span className="font-mono text-xs font-black text-[#0A2A5E]">{cardPassId}</span>
            </div>
          </div>

          {/* Card Content */}
          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">
                  {passport.category === 'UG' ? (isLeader ? 'Team Leader' : `Team Member #${idx + 1}`) : 'Solo Participant'}
                </span>
                <h4 className="font-bold text-base text-[#0A2A5E]">{person.name || `Member ${idx + 1}`}</h4>
                <p className="text-[11px] text-gray-600 font-medium">{person.email || 'No email provided'}</p>
                {person.mobile && <p className="text-[10px] text-gray-500 font-mono mt-0.5">Mobile: {person.mobile}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${isLeader ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-50 text-[#0A2A5E] border border-blue-200'}`}>
                {isLeader ? 'Leader' : `Member ${idx + 1}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Category</span>
                <span className="font-bold text-[#FF6B00]">{passport.category === 'UG' ? 'UG / Diploma' : passport.category || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Year of Study</span>
                <span className="font-bold text-[#0A2A5E]">{person.year || leader.year || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Event Track</span>
              <span className="font-bold text-xs text-[#0A2A5E] block">
                {passport.track || 'No track selected'}
              </span>
              {trackInfo && (
                <span className="text-[10px] text-gray-500 italic block mt-0.5">"{trackInfo.short}"</span>
              )}
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">College / Institute</span>
              <span className="font-semibold text-xs text-[#0A2A5E] block">
                {person.institution || leader.institution || 'Affiliated Institution'}
              </span>
              <span className="text-[10px] text-gray-500 block">{person.department || leader.department}</span>
            </div>

            {passport.category === 'UG' && passport.team && (
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Team Name</span>
                <span className="font-bold text-xs text-[#0A2A5E]">{passport.team}</span>
              </div>
            )}
          </div>
        </div>

        {/* Barcode Footer & Official Stamp */}
        <div className="mt-5 pt-3 border-t-2 border-dashed border-gray-200 flex items-end justify-between">
          <div className="space-y-1">
            <div className="h-5 w-32 bg-[repeating-linear-gradient(90deg,#0A2A5E,#0A2A5E_2px,transparent_2px,transparent_4px,#0A2A5E_4px,#0A2A5E_6px,transparent_6px,transparent_7px)] opacity-60" />
            <span className="text-[8px] font-mono text-gray-400 block tracking-wider">OFFICIAL EVENT CODE</span>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#FF6B00] flex flex-col items-center justify-center rotate-6 select-none pointer-events-none bg-[#FF6B00]/5 shadow-xs">
              <span className="text-[6px] font-black text-[#FF6B00] uppercase tracking-wider">IEEE SLRTCE</span>
              <span className="text-[10px] font-black text-[#0A2A5E] leading-tight">INSPIRE</span>
              <span className="text-[7px] font-bold text-[#138808]">2026</span>
            </div>
            <span className="text-[10px] font-bold text-[#138808] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Valid Pass
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 w-full flex flex-col items-center">
      {/* Header - Centered hero banner */}
      <div className="mb-8 w-full max-w-2xl mx-auto flex flex-col items-center text-center bg-[#FAF6EE]/90 backdrop-blur-[2px] p-4 sm:p-5 rounded-2xl border border-[#C8B89A]/30 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
          <Sparkles className="w-3 h-3 text-[#FF6B00]" />
          PARTICIPANT PROFILE
        </div>
        <h1 className="font-display text-2xl sm:text-3xl sm:text-4xl font-extrabold text-[#0A2A5E]">
          {hasSubmitted ? 'Official Event Passes' : 'Participant Profile'}
        </h1>
        <p className="text-xs sm:text-sm text-[#5A5A7A] mt-1 text-center">
          {hasSubmitted
            ? 'Verified event passes and credentials for entry and presentation access.'
            : 'Review and update your profile details and team members for event records.'}
        </p>
      </div>

      {hasSubmitted && (
        <div className="mb-8 w-full max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-left">
            <Lock className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="text-xs font-bold text-amber-900 block uppercase tracking-wide">Submission Received · Profile Locked</span>
              <span className="text-[11px] text-amber-800 font-medium">Your abstract/ppt has been submitted and is under review. Profile editing is disabled.</span>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-xs font-bold text-[#0A2A5E] bg-white border border-[#C8B89A] px-3.5 py-2 rounded-xl hover:bg-gray-50 shrink-0 ml-3"
          >
            ← Dashboard
          </Link>
        </div>
      )}

      {/* Toast Notification - Floating at top-right completely clear of footer */}
      {toast && (
        <div className="fixed top-20 right-6 z-[9999] bg-[#138808] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>Profile Changes Saved Successfully!</span>
        </div>
      )}

      {hasSubmitted ? (
        /* Submitted View: Remove left form side completely & display official ID Cards for all members */
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C8B89A]/40 pb-4">
            <div>
              <h3 className="font-display text-xl font-extrabold text-[#0A2A5E] uppercase tracking-wider">
                {passport.people.length > 1
                  ? `Official Team Event Passes (${passport.people.length} Members)`
                  : 'Official Participant Event Pass'}
              </h3>
              <p className="text-xs text-[#5A5A7A] mt-0.5 font-medium">
                Verified event credentials for entry, presentation, and track participation at INSPIRE Colloquium 2026.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 bg-[#0A2A5E] hover:bg-[#1E3A8A] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0"
            >
              <span>← Return to Dashboard</span>
            </Link>
          </div>

          {/* Cards Grid */}
          <div className={`grid grid-cols-1 ${passport.people.length > 1 ? 'md:grid-cols-2' : 'max-w-md mx-auto'} gap-6`}>
            {passport.people.map((person, idx) => renderMemberIDCard(person, idx))}
          </div>
        </div>
      ) : (
        /* Standard 2-Column Editable View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Left 7 Cols: Form Editor */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Prominent Red Validation Error Alert */}
            {showErrorBanner && (
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50/95 border-2 border-red-500 text-red-900 flex items-start gap-3.5 shadow-lg animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-900">
                    Cannot Save Profile: Mandatory credentials cannot be left blank:
                  </p>
                  <ul className="list-disc list-inside text-xs text-red-700 font-semibold space-y-0.5 mt-1">
                    {profileErrors['leader_name'] && <li>Full Legal Name is required (cannot be blank).</li>}
                    {profileErrors['leader_email'] && <li>{profileErrors['leader_email']}</li>}
                    {profileErrors['leader_mobile'] && <li>{profileErrors['leader_mobile']}</li>}
                    {profileErrors['leader_institution'] && <li>{profileErrors['leader_institution']}</li>}
                    {profileErrors['leader_department'] && <li>{profileErrors['leader_department']}</li>}
                    {profileErrors['leader_year'] && <li>{profileErrors['leader_year']}</li>}
                    {profileErrors['team'] && <li>{profileErrors['team']}</li>}
                    {profileErrors['team_min'] && <li>{profileErrors['team_min']}</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Academic Division & Track */}
            <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-[#0A2A5E] border-b border-[#C8B89A]/40 pb-2">
                Academic Tier & Research Track
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    Participation Category
                  </label>
                  <select
                    value={passport.category}
                    onChange={(e) => setPassport({ ...passport, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#C8B89A] bg-white text-sm sm:text-xs font-semibold text-[#0A2A5E] min-h-[44px]"
                  >
                    <option value="">Select Category</option>
                    <option value="UG">UG / Diploma</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="PPG">Post-PG / PhD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    Research Track
                  </label>
                  <select
                    value={passport.track}
                    onChange={(e) => setPassport({ ...passport, track: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#C8B89A] bg-white text-sm sm:text-xs font-semibold text-[#0A2A5E] min-h-[44px]"
                  >
                    <option value="">Select Track</option>
                    {tracks.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {passport.category === 'UG' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                      Team Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={passport.team}
                      onChange={(e) => {
                        setPassport({ ...passport, team: e.target.value });
                        if (profileErrors['team']) {
                          setProfileErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.team;
                            return copy;
                          });
                        }
                      }}
                      placeholder=""
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                        profileErrors['team']
                          ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                          : 'border-[#C8B89A] bg-white'
                      }`}
                    />
                    {profileErrors['team'] && (
                      <p className="text-[11px] text-red-600 mt-1 font-semibold">{profileErrors['team']}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lead Participant Info */}
            <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-[#0A2A5E] border-b border-[#C8B89A]/40 pb-2">
                Team Leader / Primary Participant
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={leader.name}
                    onChange={(e) => {
                      handleLeaderChange('name', e.target.value);
                      if (profileErrors['leader_name']) {
                        setProfileErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.leader_name;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Full Name"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs font-semibold min-h-[44px] ${
                      profileErrors['leader_name']
                        ? 'border-red-500 bg-red-50/30 ring-2 ring-red-400'
                        : 'border-[#C8B89A] bg-white'
                    } `}
                  />
                  {profileErrors['leader_name'] && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                      {profileErrors['leader_name']}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase text-[#0A2A5E]">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Use personal email ID
                    </span>
                  </div>
                  <input
                    type="email"
                    value={leader.email}
                    onChange={(e) => {
                      handleLeaderChange('email', e.target.value);
                      if (profileErrors['leader_email']) {
                        setProfileErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.leader_email;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Enter personal email ID (e.g. name@gmail.com)"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                      profileErrors['leader_email']
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-[#C8B89A] bg-white'
                    } `}
                  />
                  {profileErrors['leader_email'] && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                      {profileErrors['leader_email']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    WhatsApp Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={leader.mobile}
                    onChange={(e) => {
                      handleLeaderChange('mobile', e.target.value.replace(/\D/g, ''));
                      if (profileErrors['leader_mobile']) {
                        setProfileErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.leader_mobile;
                          return copy;
                        });
                      }
                    }}
                    placeholder="10-digit mobile"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                      profileErrors['leader_mobile']
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-[#C8B89A] bg-white'
                    } `}
                  />
                  {profileErrors['leader_mobile'] && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                      {profileErrors['leader_mobile']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    Year of Study <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={leader.year}
                    onChange={(e) => {
                      handleLeaderChange('year', e.target.value);
                      if (profileErrors['leader_year']) {
                        setProfileErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.leader_year;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                      profileErrors['leader_year']
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-[#C8B89A] bg-white'
                    } `}
                  >
                    <option value="">Select Year</option>
                    {yearOptionsFor(passport.category).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  {profileErrors['leader_year'] && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                      {profileErrors['leader_year']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    College / Institution <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={leader.institution}
                    onChange={(e) => {
                      handleLeaderChange('institution', e.target.value);
                      if (profileErrors['leader_institution']) {
                        setProfileErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.leader_institution;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Institution"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                      profileErrors['leader_institution']
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-[#C8B89A] bg-white'
                    } `}
                  />
                  {profileErrors['leader_institution'] && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                      {profileErrors['leader_institution']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={leader.department}
                    onChange={(e) => {
                      handleLeaderChange('department', e.target.value);
                      if (profileErrors['leader_department']) {
                        setProfileErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.leader_department;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Department"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                      profileErrors['leader_department']
                        ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                        : 'border-[#C8B89A] bg-white'
                    } `}
                  />
                  {profileErrors['leader_department'] && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                      {profileErrors['leader_department']}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Team Participants Directory - UG Only */}
            {passport.category === 'UG' ? (
              <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#C8B89A]/40 pb-3 gap-2">
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#0A2A5E]">
                      Team Participants ({passport.people.length - 1})
                    </h3>
                    <p className="text-xs text-[#5A5A7A] mt-0.5">
                      UG / Diploma teams can have 2 to 4 members. Enter details for all participants.
                    </p>
                  </div>
                  {passport.people.length < 4 && (
                    <button
                      type="button"
                      onClick={addMember}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0A2A5E] hover:bg-[#082046] px-3.5 py-2 rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 self-start sm:self-auto min-h-[38px]"
                    >
                      <Plus className="w-4 h-4" /> Add Participant
                    </button>
                  )}
                </div>

                {passport.people.length === 1 ? (
                  <div className="text-center py-6 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/70 space-y-2.5">
                    <Users className="w-9 h-9 text-amber-600 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-950">Team Incomplete: At Least 2 Members Required</h4>
                      <p className="text-xs text-amber-800 max-w-md mx-auto mt-0.5">
                        UG / Diploma tracks require teams of 2 to 4 members. You are currently the only person in this team. Please add your teammate(s).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addMember}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#FF6B00] hover:bg-[#E65A00] px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer min-h-[40px]"
                    >
                      <Plus className="w-4 h-4" /> Add Team Participant
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {passport.people.slice(1).map((m, idx) => {
                      const actualIdx = idx + 1;
                      const nameErr = profileErrors[`member_${actualIdx}_name`];
                      const emailErr = profileErrors[`member_${actualIdx}_email`];
                      const mobileErr = profileErrors[`member_${actualIdx}_mobile`];
                      const yearErr = profileErrors[`member_${actualIdx}_year`];
                      const instErr = profileErrors[`member_${actualIdx}_institution`];
                      const deptErr = profileErrors[`member_${actualIdx}_department`];

                      return (
                        <div
                          key={actualIdx}
                          className="p-4 sm:p-5 bg-white border border-[#C8B89A] rounded-xl shadow-sm space-y-4 relative"
                        >
                          <div className="flex items-center justify-between border-b border-[#C8B89A]/30 pb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E] flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                              Participant #{actualIdx + 1}
                            </span>
                            <button
                              type="button"
                              disabled={passport.people.length <= 2}
                              onClick={() => removeMember(actualIdx)}
                              className={`text-xs font-bold flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-lg transition-colors ${
                                passport.people.length <= 2
                                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                              }`}
                              title={
                                passport.people.length <= 2
                                  ? 'UG teams require minimum 2 members. You cannot remove the last teammate.'
                                  : 'Remove Participant'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{passport.people.length <= 2 ? 'Min 2 Required' : 'Remove'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                                Full Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) => handleMemberChange(actualIdx, 'name', e.target.value)}
                                placeholder="Full Name"
                                className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs font-semibold min-h-[44px] ${
                                  nameErr
                                    ? 'border-red-500 bg-red-50/30 ring-2 ring-red-400'
                                    : 'border-[#C8B89A] bg-white'
                                }`}
                              />
                              {nameErr && (
                                <p className="text-[11px] text-red-600 mt-1 font-semibold">{nameErr}</p>
                              )}
                            </div>

                            {/* Email */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold uppercase text-[#0A2A5E]">
                                  Email Address <span className="text-red-500">*</span>
                                </label>
                                <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Personal email ID
                                </span>
                              </div>
                              <input
                                type="email"
                                value={m.email}
                                onChange={(e) => handleMemberChange(actualIdx, 'email', e.target.value)}
                                placeholder="Enter personal email ID"
                                className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                                  emailErr
                                    ? 'border-red-500 bg-red-50/30 ring-2 ring-red-400'
                                    : 'border-[#C8B89A] bg-white'
                                }`}
                              />
                              {emailErr && (
                                <p className="text-[11px] text-red-600 mt-1 font-semibold">{emailErr}</p>
                              )}
                            </div>

                            {/* WhatsApp Mobile */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                                WhatsApp Mobile <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                maxLength={10}
                                value={m.mobile}
                                onChange={(e) =>
                                  handleMemberChange(actualIdx, 'mobile', e.target.value.replace(/\D/g, ''))
                                }
                                placeholder="10-digit mobile"
                                className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                                  mobileErr
                                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                                    : 'border-[#C8B89A] bg-white'
                                }`}
                              />
                              {mobileErr && (
                                <p className="text-[11px] text-red-600 mt-1 font-semibold">{mobileErr}</p>
                              )}
                            </div>

                            {/* Year of Study */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                                Year of Study <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={m.year}
                                onChange={(e) => handleMemberChange(actualIdx, 'year', e.target.value)}
                                className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                                  yearErr
                                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                                    : 'border-[#C8B89A] bg-white'
                                }`}
                              >
                                <option value="">Select Year</option>
                                {yearOptionsFor(passport.category).map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                              {yearErr && (
                                <p className="text-[11px] text-red-600 mt-1 font-semibold">{yearErr}</p>
                              )}
                            </div>

                            {/* College / Institution */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                                College / Institution <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={m.institution}
                                onChange={(e) => handleMemberChange(actualIdx, 'institution', e.target.value)}
                                placeholder="Institution name"
                                className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                                  instErr
                                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                                    : 'border-[#C8B89A] bg-white'
                                }`}
                              />
                              {instErr && (
                                <p className="text-[11px] text-red-600 mt-1 font-semibold">{instErr}</p>
                              )}
                            </div>

                            {/* Department */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-[#0A2A5E] mb-1">
                                Department <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={m.department}
                                onChange={(e) => handleMemberChange(actualIdx, 'department', e.target.value)}
                                placeholder="Department / Branch"
                                className={`w-full px-3 py-2.5 rounded-lg border text-sm sm:text-xs min-h-[44px] ${
                                  deptErr
                                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                                    : 'border-[#C8B89A] bg-white'
                                }`}
                              />
                              {deptErr && (
                                <p className="text-[11px] text-red-600 mt-1 font-semibold">{deptErr}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#FAF6EE] border-2 border-dashed border-[#C8B89A] rounded-2xl p-6 text-center shadow-sm">
                <h3 className="font-display text-base font-bold text-[#0A2A5E]">Individual Registration</h3>
                <p className="text-xs text-[#5A5A7A] max-w-md mx-auto mt-1">
                  You are registered as an individual participant ({passport.category || 'PG/PPG'}). Additional team members are only for UG / Diploma teams.
                </p>
              </div>
            )}

            {/* Save Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-2 gap-3">
              <Link to="/dashboard" className="text-xs font-semibold text-[#5A5A7A] hover:text-[#0A2A5E]">
                ← Back to Dashboard
              </Link>
              {!hasSubmitted ? (
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </button>
              ) : (
                <div className="px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-300 text-gray-500 text-xs font-bold flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Editing Locked Post-Submission</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right 5 Cols: Live Digital Passport Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Pass Preview</span>
              <span className="text-[10px] font-mono text-gray-400">Updates as you type</span>
            </div>

            {/* Passport Container */}
            <div className="bg-white border-4 border-[#0A2A5E] rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              {/* Passport Header */}
              <div className="flex items-center gap-2.5 border-b border-gray-200 pb-3 mb-4">
                <img src="/slrtce-logo.png" alt="SLRTCE" className="h-8 w-auto object-contain" />
                <div className="h-6 w-px bg-gray-300" />
                <img src="/ieee-slrtce-logo.png" alt="IEEE" className="h-8 w-auto object-contain" />
                <div className="ml-auto text-right">
                  <span className="text-[9px] font-mono text-gray-400 uppercase block">Pass ID</span>
                  <span className="font-mono text-xs font-black text-[#0A2A5E]">{registrationId}</span>
                </div>
              </div>

              {/* Live Card Content */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">Team Leader / Participant</span>
                  <h4 className="font-bold text-sm text-[#0A2A5E]">{leader.name || 'Your Full Name'}</h4>
                  <p className="text-[11px] text-gray-500">{leader.email || 'email@domain.com'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Category</span>
                    <span className="font-bold text-[#FF6B00]">{passport.category === 'UG' ? 'UG / Diploma' : passport.category || 'Not chosen'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Year of Study</span>
                    <span className="font-bold text-[#0A2A5E]">{leader.year || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">Event Track</span>
                  <span className="font-bold text-xs text-[#0A2A5E] block">
                    {passport.track || 'No track selected'}
                  </span>
                  {trackInfo && (
                    <span className="text-[10px] text-gray-500 italic block mt-0.5">"{trackInfo.short}"</span>
                  )}
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">College / Institute</span>
                  <span className="font-semibold text-xs text-[#0A2A5E] block">
                    {leader.institution || 'Affiliated Institution'}
                  </span>
                  <span className="text-[10px] text-gray-500 block">{leader.department}</span>
                </div>

                {passport.category === 'UG' && passport.team && (
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Team Name</span>
                    <span className="font-bold text-xs text-[#0A2A5E]">{passport.team}</span>
                  </div>
                )}

                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">
                    {passport.category === 'UG' ? 'Team Size' : 'Participation Type'}
                  </span>
                  <span className="font-bold text-xs text-[#0A2A5E]">
                    {passport.category === 'UG'
                      ? passport.people.length < 2
                        ? '1 Member (Incomplete Team • Min 2 Required)'
                        : `${passport.people.length} Member(s)`
                      : '1 Member (Solo Participation)'}
                  </span>
                </div>

                {passport.category === 'UG' && passport.people.length > 1 && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">
                      Team Participants ({passport.people.length - 1})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {passport.people.slice(1).map((p, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-700">
                          {p.name || `Member ${i + 2}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Barcode Footer & Official Stamp */}
              <div className="mt-5 pt-3 border-t-2 border-dashed border-gray-200 flex items-end justify-between">
                <div className="space-y-1">
                  <div className="h-5 w-32 sm:w-36 bg-[repeating-linear-gradient(90deg,#0A2A5E,#0A2A5E_2px,transparent_2px,transparent_4px,#0A2A5E_4px,#0A2A5E_6px,transparent_6px,transparent_7px)] opacity-60" />
                  <span className="text-[8px] font-mono text-gray-400 block tracking-wider">OFFICIAL EVENT CODE</span>
                </div>

                <div className="flex flex-col items-center gap-1 shrink-0">
                  {/* Circular Official Stamp placed right above Valid Pass */}
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#FF6B00] flex flex-col items-center justify-center rotate-6 select-none pointer-events-none bg-[#FF6B00]/5 shadow-xs">
                    <span className="text-[6.5px] font-black text-[#FF6B00] uppercase tracking-wider">IEEE SLRTCE</span>
                    <span className="text-[11px] font-black text-[#0A2A5E] leading-tight">INSPIRE</span>
                    <span className="text-[7.5px] font-bold text-[#138808]">2026</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#138808] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Valid Pass
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default ProfilePage;
