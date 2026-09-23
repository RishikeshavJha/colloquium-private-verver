import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  blankPassport,
  emptyPerson,
  loadPassport,
  savePassport,
  validatePerson,
  yearOptionsFor,
  getAuthUser,
  isEmailRegistered,
  type Passport,
  type Person,
  type AuthUser,
} from '../utils/storage';
import { saveUserRegistration, getUserDoc, getTeamMembers, type FirestoreTeamMember } from '../lib/db';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import CommunityQR from '../components/CommunityQR';
import { GoogleSvg } from '../components/GoogleAuthModal';
import { useInspireBackground, type BackgroundDensity } from '../context/InspireBackgroundContext';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Sparkles,
  Lightbulb,
  BookOpen,
} from 'lucide-react';

const trackThemeImages: Record<string, { image: string; sdgs: number[]; color: string }> = {
  'AI & Machine Learning': { image: '/themes/ai_ml.jpg', sdgs: [4, 8, 9, 10], color: '#1E3A8A' },
  'Internet of Things': { image: '/themes/iot.jpg', sdgs: [9, 11, 12], color: '#0F172A' },
  'Healthcare & MedTech': { image: '/themes/health.jpg', sdgs: [3, 5, 10], color: '#9F1239' },
  'Sustainability & Green Technology': { image: '/themes/sustainability.jpg', sdgs: [6, 7, 11, 12, 13], color: '#138808' },
  'Cybersecurity & Digital Trust': { image: '/themes/cybersecurity.jpg', sdgs: [9, 16], color: '#1E40AF' },
  'Automation': { image: '/themes/automation.jpg', sdgs: [8, 9, 12], color: '#FF6B00' },
  'FinTech': { image: '/themes/fintech.jpg', sdgs: [1, 8, 9, 10], color: '#D97706' },
  'Blockchain': { image: '/themes/blockchain.jpg', sdgs: [9, 16], color: '#2563EB' },
  'Emerging Technologies': { image: '/themes/emerging.jpg', sdgs: [4, 8, 9, 11], color: '#5B21B6' },
};

const categoryDetails = {
  UG: {
    title: 'UG / Diploma',
    trackType: 'ideathon' as const,
    trackLabel: 'Ideathon',
    teamRule: 'Teams of 2 to 4 members',
    desc: "For Diploma and Bachelor's degree students (B.Tech, B.E., B.Sc, BCA, etc.). Compete in teams of 2 to 4 to present your project ideas in the Ideathon.",
    color: '#FF6B00',
    badgeImage: '/ug-category-emblem.jpg',
  },
  PG: {
    title: 'Postgraduate (PG)',
    trackType: 'research' as const,
    trackLabel: 'Research',
    teamRule: 'Individual (Solo)',
    desc: "For Master's students (M.Tech, M.E., MCA, M.Sc, etc.). Participate solo to present your research paper.",
    color: '#0A2A5E',
    badgeImage: '/pg-category-emblem.jpg',
  },
  PPG: {
    title: 'Post-PG / PhD',
    trackType: 'research' as const,
    trackLabel: 'Research',
    teamRule: 'Individual (Solo)',
    desc: 'For PhD scholars and doctoral candidates. Participate solo to present your advanced research paper.',
    color: '#138808',
    badgeImage: '/ppg-category-emblem.jpg',
  },
};

// ================= MAIN REGISTER PAGE =================
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [hasEntered, setHasEntered] = useState<boolean>(() => !!getAuthUser());
  const [step, setStep] = useState<number>(1);
  const [isAssemblingQR, setIsAssemblingQR] = useState<boolean>(false);
  const [isBuildingProfile, setIsBuildingProfile] = useState<boolean>(false);
  const [firestoreSaving, setFirestoreSaving] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string>('');
  const [data, setData] = useState<Passport>(() => loadPassport());
  const selectedTrack = data.category === 'UG' ? 'ideathon' : (data.category === 'PG' || data.category === 'PPG') ? 'research' : null;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, setAuthUserState] = useState<AuthUser | null>(() => getAuthUser());
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
      await handleAuthSuccess(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setEntranceError('Sign-in failed. Please try again.');
      }
    } finally {
      setEntranceLoading(false);
    }
  };

  // Dynamic density per registration step: Category (normal), Leader & Team (quiet), WhatsApp (normal), Event Pass (expressive)
  const stepDensity: BackgroundDensity =
    step === 1 ? 'normal' :
    step === 2 || step === 3 ? 'quiet' :
    step === 4 ? 'normal' : 'expressive';

  useInspireBackground(stepDensity);

  const handleAuthSuccess = async (user: AuthUser) => {
    setAuthUserState(user);

    // Check Firestore to see if user data already exists in database
    const existingDoc = await getUserDoc(user.id);
    const isAlreadyRegistered = !user.isNewUser || !!existingDoc || isEmailRegistered(user.email);

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
      setData(freshPassport);
      setHasEntered(true);
      setStep(1);
    }
  };

  useEffect(() => {
    const currentUser = getAuthUser();
    const saved = loadPassport();

    if (currentUser?.id) {
      setHasEntered(true);
      // Fetch both the leader doc AND the teamMembers subcollection
      Promise.all([
        getUserDoc(currentUser.id),
        getTeamMembers(currentUser.id),
      ]).then(([docData, teamMemberDocs]) => {
        if (docData) {
          const leaderPerson = {
            name: docData.name || currentUser.name,
            email: docData.email || currentUser.email,
            mobile: docData.phoneNumber || '',
            institution: docData.college || '',
            department: docData.branch || '',
            year: docData.year || '',
            github: docData.githubProfileUrl || '',
            linkedin: docData.linkedinProfileUrl || '',
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
            category: docData.degree || 'UG',
            track: saved.track || '',
            team: docData.teamName || saved.team || '',
            people: [leaderPerson, ...memberPeople],
            registered: true,
            abstracts: saved.abstracts || [],
          };
          savePassport(restoredPassport);
          setData(restoredPassport);
        }
      }).catch(err => console.error("Error fetching user doc on mount:", err));
    }

    if (!saved.registered) {
      if (currentUser?.email) {
        setHasEntered(true);
        const currentLeader = saved.people[0] || emptyPerson();
        saved.people = [{
          ...currentLeader,
          name: currentLeader.name || currentUser.name || '',
          email: currentUser.email,
        }];
        savePassport(saved);
        setData(saved);
      }
      return;
    }

    if (saved.category) {
      // If category is PG or PPG (individual event), strictly enforce 1 member and no team delegation
      if (saved.category !== 'UG') {
        if (saved.people.length > 1 || saved.team) {
          saved.people = [saved.people[0] || emptyPerson()];
          saved.team = '';
          savePassport(saved);
        }
      }

      const leader = saved.people[0];
      if (leader && saved.people.length > 1) {
        const seenEmails = new Set<string>();
        if (leader.email) seenEmails.add(leader.email.trim().toLowerCase());
        const seenMobiles = new Set<string>();
        if (leader.mobile) seenMobiles.add(leader.mobile.trim());

        saved.people = [
          leader,
          ...saved.people.slice(1).map((m) => {
            const mEmail = (m.email || '').trim().toLowerCase();
            const mMobile = (m.mobile || '').trim();
            const duplicateEmail = mEmail && seenEmails.has(mEmail);
            if (mEmail && !duplicateEmail) seenEmails.add(mEmail);

            const duplicateMobile = mMobile && seenMobiles.has(mMobile);
            if (mMobile && !duplicateMobile) seenMobiles.add(mMobile);

            return {
              ...m,
              email: duplicateEmail ? '' : m.email,
              mobile: duplicateMobile ? '' : m.mobile,
              institution: m.institution || leader.institution || '',
              department: m.department || leader.department || '',
              year: m.year || leader.year || '',
            };
          }),
        ];
      }
      setData(saved);
    }
  }, []);

  // Ensure smooth scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, hasEntered]);

  const handleUpdate = (updater: (prev: Passport) => Passport) => {
    setData((prev) => {
      const next = updater(prev);
      savePassport(next);
      return next;
    });
  };

  const toTitleCase = (val: string) => {
    return val.replace(/(^|\s)\S/g, (char) => char.toUpperCase());
  };

  const handleLeaderChange = (field: keyof Person, value: string) => {
    const formattedValue = field === 'name' ? toTitleCase(value) : value;
    handleUpdate((prev) => {
      const oldLeader = prev.people[0] || emptyPerson();
      const leader = { ...oldLeader, [field]: formattedValue };
      
      const updatedMembers = prev.people.slice(1).map((m) => {
        if (field === 'institution' || field === 'department' || field === 'year' || field === 'courseType') {
          const oldVal = oldLeader[field];
          if (!m[field] || m[field] === oldVal) {
            return { ...m, [field]: formattedValue };
          }
        }
        return m;
      });

      return { ...prev, people: [leader, ...updatedMembers] };
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleMemberChange = (index: number, field: keyof Person, value: string) => {
    const formattedValue = field === 'name' ? toTitleCase(value) : value;
    handleUpdate((prev) => {
      const updated = [...prev.people];
      updated[index] = { ...updated[index], [field]: formattedValue };
      return { ...prev, people: updated };
    });
    const errKey = `member_${index}_${field}`;
    if (errors[errKey] || errors.general) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        delete next.general;
        return next;
      });
    }
  };

  const addMember = () => {
    if (data.people.length >= 4) return;
    const leader = data.people[0];
    handleUpdate((prev) => ({
      ...prev,
      people: [
        ...prev.people,
        {
          name: '',
          email: '',
          mobile: '',
          institution: leader?.institution || '',
          department: leader?.department || '',
          year: leader?.year || '',
          github: '',
          linkedin: '',
        },
      ],
    }));
  };

  const removeMember = (index: number) => {
    if (data.category === 'UG' && data.people.length <= 2) return;
    if (data.people.length <= 1) return;
    handleUpdate((prev) => ({
      ...prev,
      people: prev.people.filter((_, i) => i !== index),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`member_${index}_`)) {
          delete next[k];
        }
      });
      return next;
    });
  };

  // Auto-ensure at least 2 team members for UG category so Member #2 form is shown by default in Step 3.
  useEffect(() => {
    if (data.category === 'UG' && data.people.length < 2) {
      handleUpdate((prev) => {
        if (prev.category === 'UG' && prev.people.length < 2) {
          const leader = prev.people[0] || emptyPerson();
          const member2 = {
            ...emptyPerson(),
            institution: leader.institution || '',
            department: leader.department || '',
            year: leader.year || '',
          };
          return { ...prev, people: [leader, member2] };
        }
        return prev;
      });
    }
  }, [data.category, step]);

  // Ensure smooth scroll to top when changing steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, hasEntered]);

  const canProceed = () => {
    if (step === 1) {
      return !!data.category;
    }
    if (step === 2) {
      const leader = data.people[0] || emptyPerson();
      const errs = validatePerson(leader);
      if (data.category === 'UG' && !data.team.trim()) {
        errs.team = 'Team name is required for UG / Diploma participation.';
      }
      const cleanEmail = leader.email.trim().toLowerCase();
      if (!data.registered && cleanEmail && isEmailRegistered(cleanEmail)) {
        errs.email = 'This email is already registered in INSPIRE Colloquium 2026. Please log in to your dashboard or use another email.';
      }
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }
    if (step === 3) {
      if (data.category === 'UG') {
        if (data.people.length < 2) {
          alert('UG / Diploma registration requires at least 2 team members (1 Team Leader + at least 1 Team Member). Please add your team member(s).');
          return false;
        }

        const newErrors: Record<string, string> = {};
        const leaderEmail = (data.people[0]?.email || '').trim().toLowerCase();
        const leaderMobile = (data.people[0]?.mobile || '').trim();

        // Track seen emails & mobiles: key -> label
        const seenEmails: Record<string, string> = {};
        if (leaderEmail) {
          seenEmails[leaderEmail] = 'Team Leader';
        }
        const seenMobiles: Record<string, string> = {};
        if (leaderMobile) {
          seenMobiles[leaderMobile] = 'Team Leader';
        }

        let hasError = false;

        for (let i = 1; i < data.people.length; i++) {
          const m = data.people[i];
          const memberLabel = `Team Member #${i + 1}`;
          const errs = validatePerson(m);

          // Copy format validation errors
          if (errs.name) newErrors[`member_${i}_name`] = errs.name;
          if (errs.email) newErrors[`member_${i}_email`] = errs.email;
          if (errs.mobile) newErrors[`member_${i}_mobile`] = errs.mobile;
          if (errs.year) newErrors[`member_${i}_year`] = errs.year;
          if (errs.institution) newErrors[`member_${i}_institution`] = errs.institution;
          if (errs.department) newErrors[`member_${i}_department`] = errs.department;

          const mEmail = (m.email || '').trim().toLowerCase();
          const mMobile = (m.mobile || '').trim();

          // Duplicate Email Check within team & against Lead Author
          if (mEmail) {
            if (seenEmails[mEmail]) {
              newErrors[`member_${i}_email`] = `Duplicate email! This email is already assigned to ${seenEmails[mEmail]}. Each member must have a unique email.`;
              hasError = true;
            } else {
              seenEmails[mEmail] = memberLabel;
            }

            // Already registered check — done server-side via Firestore now
            // if (!data.registered && isEmailRegistered(mEmail)) { ... }
          }

          // Duplicate Mobile Check within team & against Lead Author
          if (mMobile) {
            if (seenMobiles[mMobile]) {
              newErrors[`member_${i}_mobile`] = `Duplicate mobile number! Already used by ${seenMobiles[mMobile]}.`;
              hasError = true;
            } else {
              seenMobiles[mMobile] = memberLabel;
            }
          }

          if (Object.keys(errs).length > 0) {
            hasError = true;
          }
        }

        if (hasError) {
          setErrors(newErrors);
          const firstErr = Object.values(newErrors)[0];
          alert(`Validation Issue:\n${firstErr}`);
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const nextStep = async () => {
    if (canProceed()) {
      if (data.category !== 'UG') {
        handleUpdate((prev) => ({
          ...prev,
          team: '',
          people: [prev.people[0] || emptyPerson()],
        }));
      } else if (step === 2 && data.people.length < 2) {
        handleUpdate((prev) => {
          if (prev.category === 'UG' && prev.people.length < 2) {
            const leader = prev.people[0] || emptyPerson();
            const member2 = {
              ...emptyPerson(),
              institution: leader.institution || '',
              department: leader.department || '',
              year: leader.year || '',
            };
            return { ...prev, people: [leader, member2] };
          }
          return prev;
        });
      }

      if (step === 3) {
        const finalPeople = data.category === 'UG' ? data.people : [data.people[0] || emptyPerson()];
        const finalTeam = data.category === 'UG' ? data.team : '';
        handleUpdate((prev) => ({
          ...prev,
          registered: true,
          team: finalTeam,
          people: finalPeople,
        }));

        // ── Save to Firestore ─────────────────────────────────────────────
        const currentUser = getAuthUser();
        if (currentUser?.id) {
          setFirestoreSaving(true);
          setFirestoreError('');
          try {
            const leader = finalPeople[0];
            const members: FirestoreTeamMember[] = finalPeople.slice(1).map((p) => ({
              id: '',
              teamLeaderId: currentUser.id,
              name: p.name,
              email: p.email,
              phoneNumber: p.mobile,
              college: p.institution,
              branch: p.department,
              degree: data.category,
              year: p.year,
              gender: '',
              linkedinProfileUrl: p.linkedin || '',
            }));

            await saveUserRegistration(currentUser.id, {
              name: leader.name,
              email: leader.email,
              phoneNumber: leader.mobile,
              college: leader.institution,
              branch: leader.department,
              degree: data.category,
              year: leader.year,
              gender: '',
              githubProfileUrl: leader.github || '',
              linkedinProfileUrl: leader.linkedin || '',
              teamName: finalTeam,
              memberEmails: finalPeople.map((p) => p.email).filter(Boolean),
              teamMembers: members,
            });
          } catch (err) {
            console.error('Firestore save error:', err);
            setFirestoreError('Registration saved locally. Firestore sync will retry on next login.');
          } finally {
            setFirestoreSaving(false);
          }
        }
        // ──────────────────────────────────────────────────────────────────

        setIsAssemblingQR(true);
        window.scrollTo({ top: 120, behavior: 'smooth' });
        setTimeout(() => {
          setIsAssemblingQR(false);
          setStep(4);
          window.scrollTo({ top: 100, behavior: 'smooth' });
        }, 2450);
        return;
      }
      if (step === 4) {
        setIsBuildingProfile(true);
        window.scrollTo({ top: 120, behavior: 'smooth' });
        setTimeout(() => {
          setIsBuildingProfile(false);
          setStep(5);
          window.scrollTo({ top: 100, behavior: 'smooth' });
        }, 3600);
        return;
      }
      setStep((s) => Math.min(s + 1, 5));
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (isAssemblingQR) {
      setIsAssemblingQR(false);
      return;
    }
    if (isBuildingProfile) {
      setIsBuildingProfile(false);
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const registrationId = `INSPIRE-2026-${(data.team || data.people[0]?.name || 'PASS')
    .slice(0, 3)
    .toUpperCase()}-${Math.abs(
      (data.people[0]?.email || 'slrtce').split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)
    )
      .toString()
      .slice(0, 4)}`;

  const leader = data.people[0] || emptyPerson();

  // ================= ENTRANCE SCREEN (COLLAGE CREATES REGISTRATION SPACE - NO CARD) =================
  if (!hasEntered) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8 select-none relative z-10 -mt-2 -mb-20 min-h-[calc(100vh-100px)]">
        {/* 1. Base Collage Artwork Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: "url('/inspire-collage-bg.jpg')" }}
        />

        {/* 2. Solid square card - no glow, no blur */}
        <div
          className="absolute z-0 pointer-events-none"
          style={{
            width: 'min(82vw, 560px)',
            height: 'min(74vh, 470px)',
            backgroundColor: '#FAF2E5',
            borderRadius: '8px',
            border: '1.5px solid rgba(200,184,154,0.5)',
          }}
        />

        {/* 3. LOCKED REGISTRATION CONTENT (Sitting directly inside the open space, ZERO CARD) */}
        <div className="w-full max-w-xl sm:max-w-2xl relative z-10 mx-auto my-auto text-center px-4 py-2">
          {/* Institutional Logos */}
          <div className="flex items-center justify-center gap-2.5 mb-1 sm:mb-1.5">
            <img src="/slrtce-logo.png" alt="SLRTCE" className="h-6 sm:h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-[#C8B89A]" />
            <img src="/ieee-slrtce-logo.png" alt="IEEE SLRTCE" className="h-6 sm:h-7 w-auto object-contain" />
          </div>

          {/* Pill Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-[10px] sm:text-[11px] font-bold tracking-widest text-[#0A2A5E] uppercase mb-3 sm:mb-4">
            REGISTRATION · 2026
          </div>

          {/* INSPIRE Colloquium Logo */}
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="w-44 sm:w-52 h-20 sm:h-24 rounded-2xl bg-[#000688] border-2 border-dashed border-[#C8B89A] p-2 shadow-md flex items-center justify-center hover:scale-105 transition-transform duration-300 overflow-hidden">
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
  }


  return (
    <div className="w-full relative select-none flex flex-col items-center">
      {/* Foreground Registration Wizard (Unchanged UI & content) - Harmonious proportioned container */}
      <div className={`${step === 1 ? 'max-w-[1040px]' : 'max-w-[920px]'} mx-auto px-4 sm:px-6 relative z-10 w-full flex flex-col items-center ${step === 1 ? 'py-1 sm:py-2' : 'py-3 sm:py-5 md:py-6'}`}>
        {/* Top Header Bar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 border-b border-[#C8B89A]/40 mb-2 pb-1.5 sm:mb-4 sm:pb-2.5">
          <button
            type="button"
            onClick={() => setHasEntered(false)}
            className="text-xs font-bold text-[#0A2A5E] hover:text-[#FF6B00] flex items-center gap-1 transition-colors cursor-pointer min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Sign In
          </button>
        </div>

      {/* Progress Header / Breadcrumb - Centered on laptop & mobile */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center mb-3 sm:mb-5 bg-[#FAF6EE]/90 backdrop-blur-[2px] p-3 sm:p-4 rounded-2xl border border-[#C8B89A]/30 shadow-xs">
        <div className="flex items-center justify-center gap-2.5 mb-1 sm:mb-1.5">
          <img src="/slrtce-logo.png" alt="SLRTCE" className="h-6 sm:h-7 w-auto object-contain" />
          <div className="h-5 w-px bg-[#C8B89A]" />
          <img src="/ieee-slrtce-logo.png" alt="IEEE SLRTCE" className="h-6 sm:h-7 w-auto object-contain" />
        </div>

        <h1 className="font-display text-lg sm:text-2xl font-extrabold text-[#0A2A5E] leading-tight text-center">
          INSPIRE Colloquium 2026 Registration
        </h1>
        <p className="text-[11px] sm:text-xs text-[#5A5A7A] max-w-xl mx-auto mt-1 text-center">
          Complete the steps below to register for the colloquium and submit your research or idea for presentation.
        </p>

        {/* Step Indicator Tokens */}
        <div className="mt-2 sm:mt-3 w-full max-w-2xl mx-auto px-1">
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full">
            {[
              { num: 1, label: 'Category', short: 'Cat' },
              { num: 2, label: 'Leader Info', short: 'Lead' },
              { num: 3, label: 'Team', short: 'Team' },
              { num: 4, label: isAssemblingQR ? 'Opening...' : 'WhatsApp', short: 'Chat' },
              { num: 5, label: isBuildingProfile ? 'Finishing...' : 'Event Pass', short: 'Pass' },
            ].map((s) => {
              const isTransitioning = isAssemblingQR || isBuildingProfile;
              const isActive = step === s.num || (s.num === 4 && isAssemblingQR) || (s.num === 5 && isBuildingProfile);
              const isDone = s.num < step && !isTransitioning;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (!isTransitioning && s.num < step) setStep(s.num);
                  }}
                  disabled={isTransitioning || s.num > step}
                  className={`flex flex-col items-center py-1.5 sm:py-2 px-1 rounded-xl transition-all border min-h-[44px] justify-center ${isActive
                      ? 'bg-[#0A2A5E] text-white border-[#0A2A5E] shadow-sm scale-102 ring-1 ring-[#0A2A5E]/30'
                      : isDone
                        ? 'bg-[#FFFDF9]/90 border-[#138808]/50 text-[#138808] hover:bg-white cursor-pointer shadow-2xs'
                        : 'bg-[#FFFDF9]/60 text-gray-400 border-[#C8B89A]/40 cursor-not-allowed opacity-75'
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 shadow-xs ${isActive
                        ? 'bg-[#FF6B00] text-white'
                        : isDone
                          ? 'bg-[#138808] text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {isDone ? '✓' : s.num}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold truncate max-w-full">
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.short}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Archival Form Container - Completely transparent workspace directly on parchment */}
      <div className="w-full relative transition-all bg-transparent border-0 shadow-none p-0 overflow-visible">

        {/* ================= IN-BETWEEN TRANSITION: QR ASSEMBLY SEQUENCE ================= */}
        {isAssemblingQR && (
          <div className="qr-build-sequence py-8 px-4" aria-label="Joining WhatsApp Community">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] text-[11px] font-bold tracking-widest uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-ping" />
              CONNECTING...
            </div>

            <div className="qr-build-frame" aria-hidden="true">
              {/* 4 Optical Corner Guides */}
              <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#FF6B00] z-10" />
              <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#FF6B00] z-10" />
              <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#FF6B00] z-10" />
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#FF6B00] z-10" />

              {/* Assembly Laser Sweep Line */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#25D366] to-transparent shadow-[0_0_8px_#25D366] pointer-events-none z-10 animate-scan-sweep" />

              {Array.from({ length: 25 }, (_, i) => (
                <span
                  key={i}
                  style={
                    {
                      '--i': i,
                      '--x': i % 5,
                      '--y': Math.floor(i / 5),
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0A2A5E] tracking-tight mb-2">
              Joining the <br className="hidden sm:inline" />
              <span className="text-[#FF6B00] italic">INSPIRE WhatsApp group.</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#0A2A5E]/75 max-w-md mx-auto leading-relaxed">
              Connecting you with organizers, updates, and participants.
            </p>

            {/* Progress Bar Animation */}
            <div className="max-w-xs mx-auto mt-6">
              <div className="w-full bg-[#C8B89A]/30 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#FF6B00] via-[#D4AF37] to-[#25D366] h-full rounded-full animate-progress-fill" />
              </div>
              <p className="text-[10px] text-[#5A5A7A] mt-2 font-mono tracking-wider uppercase">
                Loading WhatsApp Community...
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAssemblingQR(false);
                setStep(4);
              }}
              className="mt-6 text-xs text-[#5A5A7A] hover:text-[#0A2A5E] underline cursor-pointer"
            >
              Skip to WhatsApp →
            </button>
          </div>
        )}

        {/* ================= IN-BETWEEN TRANSITION: PROFILE BUILDING SEQUENCE ================= */}
        {isBuildingProfile && (
          <div className="profile-build-sequence py-8 px-4" aria-label="Creating your event pass">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#138808]/10 border border-[#138808]/30 text-[#138808] text-[11px] font-bold tracking-widest uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-[#138808] animate-ping" />
              CREATING EVENT PASS...
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0A2A5E] tracking-tight mb-2">
              Your Event Pass <br className="hidden sm:inline" />
              <span className="text-[#138808] italic">is being created.</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#0A2A5E]/75 max-w-md mx-auto leading-relaxed mb-6">
              Saving your registration details and generating your official pass.
            </p>

            {/* Animated Passport Card Preview */}
            <div className="max-w-md mx-auto animate-passport-assemble animate-card-glow relative">
              <div className="bg-white border-4 border-[#0A2A5E] rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                {/* Gold Foil Bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF6B00] via-[#D4AF37] to-[#138808] animate-foil-shimmer" />

                {/* Seal stamp drops in */}
                <div className="absolute top-4 right-4 w-16 h-16 rounded-full border-2 border-dashed border-[#FF6B00] flex flex-col items-center justify-center select-none pointer-events-none animate-seal-drop">
                  <span className="text-[7px] font-black tracking-widest text-[#FF6B00] uppercase">IEEE SLRTCE</span>
                  <span className="text-[10px] font-black text-[#0A2A5E]">INSPIRE</span>
                  <span className="text-[8px] font-bold text-[#138808]">2026</span>
                </div>

                {/* Header */}
                <div className="flex items-center gap-2 border-b border-[#0A2A5E]/20 pb-3 mb-3 pr-16 animate-ink-reveal">
                  <img src="/slrtce-logo.png" alt="" className="h-7 w-auto object-contain" />
                  <div className="h-5 w-px bg-gray-300" />
                  <div>
                    <span className="text-[9px] font-mono font-bold text-gray-400 uppercase block">Event Pass ID</span>
                    <span className="font-mono text-[10px] font-black text-[#0A2A5E] tracking-wider">{registrationId}</span>
                  </div>
                </div>

                {/* Detail rows animate in with stagger */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                  <div className="profile-detail-row">
                    <span className="text-[8px] uppercase font-bold text-gray-400 block">{data.category === 'UG' ? 'Team Leader' : 'Participant'}</span>
                    <span className="font-bold text-xs text-[#0A2A5E]">{leader.name || 'Participant'}</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="text-[8px] uppercase font-bold text-gray-400 block">Category</span>
                    <span className="font-bold text-xs text-[#FF6B00]">
                      {categoryDetails[data.category as keyof typeof categoryDetails]?.title || data.category}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="text-[8px] uppercase font-bold text-gray-400 block">Event Track</span>
                    <span className="font-bold text-xs text-[#0A2A5E]">{data.track || 'Track'}</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="text-[8px] uppercase font-bold text-gray-400 block">College</span>
                    <span className="font-bold text-xs text-[#0A2A5E]">{leader.institution || 'SLRTCE'}</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="text-[8px] uppercase font-bold text-gray-400 block">
                      {data.category === 'UG' ? 'Team Size' : 'Participation Type'}
                    </span>
                    <span className="font-bold text-xs text-[#0A2A5E]">
                      {data.category === 'UG' ? `${data.people.length} Member(s)` : '1 Member (Solo)'}
                    </span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="text-[8px] uppercase font-bold text-gray-400 block">Status</span>
                    <span className="font-bold text-xs text-[#138808]">Registered ✓</span>
                  </div>
                </div>

                {/* Barcode prints in */}
                <div className="mt-3 pt-2 border-t border-dashed border-gray-300 flex items-center justify-between">
                  <div className="animate-barcode-print overflow-hidden">
                    <div className="font-mono text-[7px] text-gray-400 tracking-widest mb-0.5">
                      INSPIRE-2026 // SLRTCE // VERIFIED
                    </div>
                    <div className="h-4 w-full bg-[repeating-linear-gradient(90deg,#0A2A5E,#0A2A5E_2px,transparent_2px,transparent_4px,#0A2A5E_4px,#0A2A5E_6px,transparent_6px,transparent_7px)]" />
                  </div>
                  <div className="animate-validated-badge">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#138808]">
                      <ShieldCheck className="w-3 h-3" /> Validated
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-xs mx-auto mt-6">
              <div className="w-full bg-[#C8B89A]/30 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#0A2A5E] via-[#FF6B00] to-[#138808] h-full rounded-full animate-progress-fill" />
              </div>
              <p className="text-[10px] text-[#5A5A7A] mt-2 font-mono tracking-wider uppercase">
                Creating your official event pass...
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsBuildingProfile(false);
                setStep(5);
              }}
              className="mt-5 text-xs text-[#5A5A7A] hover:text-[#0A2A5E] underline cursor-pointer"
            >
              Skip to Event Pass →
            </button>
          </div>
        )}

        {/* ================= STEP 1: CATEGORY SELECTION ================= */}
        {!isAssemblingQR && !isBuildingProfile && step === 1 && (
          <div className="step-transition-enter">
            {/* Category Header Row */}
            <div className="mb-2 px-1 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                  <span className="text-[10.5px] font-bold text-[#FF6B00] uppercase tracking-wider">
                    Step 1 of 5 • Select Category
                  </span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#0A2A5E] leading-tight mt-0.5">
                  Choose Your Category
                </h2>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFCF4]/80 border border-[#C8B89A]/50 text-[#0A2A5E] text-xs font-bold shadow-2xs">
                <span>Selected:</span>
                <span className="text-[#FF6B00]">{categoryDetails[data.category as keyof typeof categoryDetails]?.title || 'None'}</span>
              </div>
            </div>

            {/* Automatic Track Status Indicator - Flattened Toolbar printed on parchment */}
            <div className="mb-1 py-1.5 px-1 bg-transparent border-0 shadow-none flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold text-[#0A2A5E] uppercase tracking-wider px-1 py-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Event Track:</span>
                </span>

                {/* Ideathon Track Indicator */}
                <div
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 select-none ${
                    selectedTrack === 'ideathon'
                      ? 'bg-gradient-to-r from-[#FF6B00] to-[#E05300] text-white shadow-sm ring-1 ring-[#FF6B00]/40 scale-[1.02]'
                      : selectedTrack === 'research'
                      ? 'bg-[#FFFCF4]/80 text-[#8C8CA1] border border-[#C8B89A]/50 opacity-70'
                      : 'bg-[#FFFCF4]/90 text-[#0A2A5E] border border-[#C8B89A]/60 shadow-2xs'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Ideathon</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      selectedTrack === 'ideathon'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#FF6B00]/10 text-[#FF6B00]'
                    }`}
                  >
                    UG / Diploma
                  </span>
                  {selectedTrack === 'ideathon' && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  )}
                </div>

                {/* Research Track Indicator */}
                <div
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 select-none ${
                    selectedTrack === 'research'
                      ? 'bg-gradient-to-r from-[#0A2A5E] to-[#1E3A8A] text-white shadow-md ring-1 ring-[#0A2A5E]/40 scale-[1.02]'
                      : selectedTrack === 'ideathon'
                      ? 'bg-[#FFFCF4]/80 text-[#8C8CA1] border border-[#C8B89A]/50 opacity-70'
                      : 'bg-[#FFFCF4]/90 text-[#0A2A5E] border border-[#C8B89A]/60 shadow-2xs'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Research</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      selectedTrack === 'research'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#0A2A5E]/10 text-[#0A2A5E]'
                    }`}
                  >
                    PG & PhD
                  </span>
                  {selectedTrack === 'research' && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-[#5A5A7A] px-1 font-medium hidden md:flex items-center gap-1.5">
                {selectedTrack === 'ideathon' ? (
                  <span className="text-[#FF6B00] font-bold">💡 Ideathon track selected for UG / Diploma</span>
                ) : selectedTrack === 'research' ? (
                  <span className="text-[#0A2A5E] font-bold">📖 Research track selected for PG & PhD</span>
                ) : (
                  <span>Select a category below to see your track</span>
                )}
              </div>
            </div>

            {/* Editorial Antique-Gold Divider between Track Toolbar and Category Cards */}
            <div className="w-full h-px bg-[#AA8246]/35 my-3 sm:my-4" />

            {/* 3 Categories Grid - Refined Paper Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6">
              {(Object.keys(categoryDetails) as (keyof typeof categoryDetails)[]).map((catKey) => {
                const item = categoryDetails[catKey];
                const isSelected = data.category === catKey;

                return (
                  <div
                    key={catKey}
                    onClick={() =>
                      handleUpdate((prev) => {
                        const leader = prev.people[0] || emptyPerson();
                        const ugPeople = prev.people.length >= 2 ? prev.people : [leader, { ...emptyPerson(), institution: leader.institution || '', department: leader.department || '', year: leader.year || '' }];
                        return {
                          ...prev,
                          category: catKey,
                          team: catKey === 'UG' ? prev.team : '',
                          people: catKey === 'UG' ? ugPeople : [leader],
                        };
                      })
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdate((prev) => {
                          const leader = prev.people[0] || emptyPerson();
                          const ugPeople = prev.people.length >= 2 ? prev.people : [leader, { ...emptyPerson(), institution: leader.institution || '', department: leader.department || '', year: leader.year || '' }];
                          return {
                            ...prev,
                            category: catKey,
                            team: catKey === 'UG' ? prev.team : '',
                            people: catKey === 'UG' ? ugPeople : [leader],
                          };
                        });
                      }
                    }}
                    className={`w-full rounded-[18px] transition-all duration-300 cursor-pointer select-none
                      /* Mobile: horizontal compact card | Desktop: tall vertical card */
                      flex flex-row items-center gap-3.5 sm:flex-col sm:justify-between sm:min-h-[395px] sm:h-full min-h-[100px] p-4 sm:p-5 lg:p-6 ${
                      isSelected
                        ? 'border-2 border-[#FF6B00] bg-[#FFFBF2]/95 shadow-[0_4px_14px_rgba(255,107,0,0.13)] scale-[1.01]'
                        : 'border border-[#C8B89A]/60 bg-[#FFFCF4]/92 sm:bg-[#FFFCF4]/80 hover:bg-[#FFFCF4] hover:border-[#C8B89A] hover:shadow-xs shadow-none'
                    }`}
                  >
                    {/* Emblem - balanced medium circular insignia */}
                    <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full p-1 sm:p-1.5 shrink-0 flex items-center justify-center transition-all sm:mx-auto sm:my-2 ${
                      isSelected ? 'opacity-100 scale-102' : 'opacity-90 hover:opacity-100'
                    }`}>
                      <img
                        src={item.badgeImage}
                        alt={item.title}
                        className="w-full h-full object-contain rounded-full transition-transform duration-300"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    </div>

                    {/* Text details - left-aligned on mobile, centered on desktop */}
                    <div className="flex-1 min-w-0 sm:text-center sm:my-auto sm:px-1">
                      {/* Mobile track badge (remains 100% unchanged for mobile optimization) */}
                      <div className="flex items-center gap-1.5 mb-1 sm:hidden flex-wrap">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          item.trackType === 'ideathon'
                            ? 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/30'
                            : 'bg-[#0A2A5E]/10 text-[#0A2A5E] border-[#0A2A5E]/20'
                        }`}>
                          {item.trackType === 'ideathon' ? <Lightbulb className="w-2.5 h-2.5" /> : <BookOpen className="w-2.5 h-2.5" />}
                          {item.trackLabel}
                        </span>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#0A2A5E]/5 text-[#0A2A5E]/80 border border-[#C8B89A]/50">
                          {catKey === 'UG' ? 'Team Participation' : 'Solo Participation'}
                        </span>
                      </div>

                      {/* Desktop participation badge - dedicated centered pill above title */}
                      <div className="hidden sm:inline-flex items-center justify-center mb-1">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#0A2A5E]/5 text-[#0A2A5E]/80 border border-[#C8B89A]/50 whitespace-nowrap">
                          {catKey === 'UG' ? 'Team Participation' : 'Solo Participation'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-center gap-2 mb-0.5 sm:mb-1">
                        <h3 className={`font-display text-base sm:text-[21px] font-bold leading-snug transition-colors truncate ${
                          isSelected ? 'text-[#FF6B00]' : 'text-[#0A2A5E]'
                        }`}>
                          {item.title}
                        </h3>
                        {/* Mobile-only selected badge */}
                        <div className="sm:hidden shrink-0">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 fill-[#138808] text-white" />
                          ) : (
                            <span className="text-[10px] text-gray-400">Tap</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11.5px] sm:text-[13px] text-[#5A5A7A] leading-relaxed line-clamp-3 sm:mt-1 sm:max-w-[290px] sm:mx-auto">
                        {item.desc}
                      </p>
                      <span className="flex items-center gap-1 text-[11px] sm:text-xs text-[#0A2A5E] font-medium mt-1 sm:mt-0 sm:hidden">
                        {catKey === 'UG' ? (
                          <Users className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-[#0A2A5E] shrink-0" />
                        )}
                        {item.teamRule}
                      </span>
                    </div>

                    {/* Desktop-only: Top status bar with Track Badge */}
                    <div className="hidden sm:flex items-center justify-between min-h-[24px] w-full order-first">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 whitespace-nowrap ${
                        item.trackType === 'ideathon'
                          ? 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/30'
                          : 'bg-[#0A2A5E]/10 text-[#0A2A5E] border-[#0A2A5E]/20'
                      }`}>
                        {item.trackType === 'ideathon' ? <Lightbulb className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {item.trackLabel}
                      </span>
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[#138808] bg-[#138808]/10 px-2.5 py-0.5 rounded-full border border-[#138808]/25 shrink-0 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-[#138808] text-white" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Selected</span>
                        </div>
                      ) : (
                        <span className="text-[10.5px] font-medium text-gray-400 shrink-0 whitespace-nowrap">Click to choose</span>
                      )}
                    </div>

                    {/* Desktop-only: Bottom row */}
                    <div className="hidden sm:flex items-center justify-between pt-3.5 mt-auto border-t border-[#C8B89A]/30 text-xs font-semibold text-[#0A2A5E] w-full">
                      <span className="flex items-center gap-1.5 text-xs text-[#0A2A5E] font-medium whitespace-nowrap shrink-0">
                        {catKey === 'UG' ? (
                          <Users className="w-4 h-4 text-[#FF6B00] shrink-0" />
                        ) : (
                          <User className="w-4 h-4 text-[#0A2A5E] shrink-0" />
                        )}
                        {item.teamRule}
                      </span>
                      <span
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all min-h-[36px] inline-flex items-center shrink-0 whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#138808] text-white shadow-xs'
                            : 'bg-[#FFFCF4] text-[#0A2A5E] border border-[#C8B89A]/70 hover:bg-white'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Editorial Antique-Gold Divider above Action Area */}
            <div className="w-full h-px bg-[#AA8246]/35 mt-4 sm:mt-5 mb-3 sm:mb-4" />

            {/* Bottom Action Row - Directly on Parchment Workspace */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-[#5A5A7A]">Your Category:</span>
                <span className="px-4 py-1.5 rounded-full bg-[#0A2A5E] text-white text-xs font-bold shadow-xs">
                  {categoryDetails[data.category as keyof typeof categoryDetails]?.title || 'None selected'}
                </span>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white text-xs sm:text-sm font-bold px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer min-h-[44px]"
              >
                <span>{data.category === 'UG' ? 'Next: Team Leader Info' : 'Next: Your Details'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LEADER / CONTACT DETAILS ================= */}
        {!isAssemblingQR && !isBuildingProfile && step === 2 && (
          <div className="step-transition-enter max-w-[740px] mx-auto">
            <div className="border-b border-[#AA8246]/35 pb-3 sm:pb-4 mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider">
                  Step 2 of 5 • {data.category === 'UG' ? 'Team Leader Details' : 'Contact Information'}
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#061838]">
                  {data.category === 'UG' ? 'Team Leader Details' : 'Your Contact Details'}
                </h2>
                <p className="text-xs sm:text-sm text-[#2D3142] mt-1 font-medium">
                  Your certificates, results, and event updates will be sent to this name and email.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const currentUser = getAuthUser();
                  handleUpdate((prev) => ({
                    ...prev,
                    people: [{
                      ...emptyPerson(),
                      name: currentUser?.name || prev.people[0]?.name || '',
                      email: currentUser?.email || prev.people[0]?.email || '',
                    }, ...prev.people.slice(1)],
                    team: '',
                  }));
                  setErrors({});
                }}
                className="text-xs font-semibold text-[#5A5A7A] hover:text-[#0A2A5E] transition-colors px-3 py-1.5 rounded-lg border border-[#C8B89A]/60 hover:bg-white/60 self-start sm:self-auto cursor-pointer min-h-[44px] inline-flex items-center"
              >
                Clear Fields
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* Team Name for UG */}
              {data.category === 'UG' && (
                <div>
                  <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#FF6B00]" />
                    <span>Team Name <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={data.team}
                    onChange={(e) => handleUpdate((prev) => ({ ...prev, team: e.target.value }))}
                    placeholder="Enter team name (e.g. Innovators)"
                    className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                  />
                  {errors.team && <p className="text-xs text-red-600 mt-1 font-medium">{errors.team}</p>}
                </div>
              )}

              {/* Full Name */}
              <div className={data.category !== 'UG' ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center justify-between">
                  <span>Full Name (as on certificate) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Auto-filled (Editable)
                  </span>
                </label>
                <input
                  type="text"
                  value={leader.name}
                  onChange={(e) => handleLeaderChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1 font-medium">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center justify-between flex-wrap gap-1">
                  <span>Email Address <span className="text-red-500">*</span></span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Google Verified
                  </span>
                </label>
                <input
                  type="email"
                  value={leader.email || getAuthUser()?.email || ''}
                  readOnly
                  disabled
                  placeholder="Your Google email"
                  className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-slate-100/90 text-slate-800 cursor-not-allowed font-medium text-base sm:text-sm focus:outline-none min-h-[46px] shadow-2xs"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-bold text-[#061838] mb-1.5">
                  WhatsApp Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={leader.mobile}
                  onChange={(e) => handleLeaderChange('mobile', e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit WhatsApp number"
                  className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                />
                {errors.mobile && <p className="text-xs text-red-600 mt-1 font-medium">{errors.mobile}</p>}
              </div>

              {/* Degree / Diploma Selection for UG */}
              {data.category === 'UG' && (
                <div>
                  <label className="block text-xs font-bold text-[#061838] mb-1.5">
                    Course Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={leader.courseType || 'Degree'}
                    onChange={(e) => {
                      const newType = e.target.value as 'Degree' | 'Diploma';
                      handleUpdate((prev) => {
                        const leader = { ...prev.people[0], courseType: newType, year: '' };
                        return { ...prev, people: [leader, ...prev.people.slice(1)] };
                      });
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                  >
                    <option value="Degree">Degree (B.E. / B.Tech / B.Sc / BCA)</option>
                    <option value="Diploma">Diploma (Polytechnic)</option>
                  </select>
                </div>
              )}

              {/* Year of Study */}
              <div>
                <label className="block text-xs font-bold text-[#061838] mb-1.5">
                  Current Year of Study <span className="text-red-500">*</span>
                </label>
                <select
                  value={leader.year}
                  onChange={(e) => handleLeaderChange('year', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                >
                  <option value="">Select Year of Study</option>
                  {yearOptionsFor(data.category, leader.courseType || 'Degree').map((y: string) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {errors.year && <p className="text-xs text-red-600 mt-1 font-medium">{errors.year}</p>}
              </div>

              {/* College / Institution */}
              <div>
                <label className="block text-xs font-bold text-[#061838] mb-1.5">
                  College / Institute Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={leader.institution}
                  onChange={(e) => handleLeaderChange('institution', e.target.value)}
                  placeholder="Enter your college or university name"
                  className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                />
                {errors.institution && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{errors.institution}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-[#061838] mb-1.5">
                  Department / Branch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={leader.department}
                  onChange={(e) => handleLeaderChange('department', e.target.value)}
                  placeholder="e.g. Computer Engineering, IT, AI&DS"
                  className="w-full px-4 py-3 rounded-xl border border-[#C8B89A]/80 bg-[#FFFDF9]/95 text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs"
                />
                {errors.department && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{errors.department}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: TEAM MEMBERS ================= */}
        {!isAssemblingQR && !isBuildingProfile && step === 3 && (
          <div className="step-transition-enter max-w-[740px] mx-auto">
            <div className="border-b border-[#AA8246]/35 pb-3 sm:pb-4 mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider">
                  Step 3 of 5 • {data.category === 'UG' ? 'Team Members (2 to 4 Members)' : 'Solo Participation'}
                </span>
                <h2 className="font-display text-xl sm:text-3xl font-bold text-[#061838]">
                  {data.category === 'UG' ? 'Team Members (2 to 4 Members)' : 'Solo Participation'}
                </h2>
                <p className="text-xs sm:text-sm text-[#2D3142] mt-1 font-medium">
                  Team Leader: <strong className="text-[#061838]">{leader.name || 'Team Leader'}</strong>.
                  {data.category === 'UG'
                    ? ' UG / Diploma teams require 2 to 4 members.'
                    : ' Postgraduate and PhD tracks are for solo participation only.'}
                </p>
              </div>

              {data.category === 'UG' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0A2A5E]/10 border border-[#0A2A5E]/20 text-[#0A2A5E] text-xs font-bold self-start sm:self-auto">
                  <Users className="w-4 h-4 text-[#FF6B00]" />
                  <span>Team Size: <strong className="text-[#FF6B00]">{data.people.length}/4</strong> Members</span>
                </div>
              )}
            </div>

            {data.category !== 'UG' ? (
              <div className="p-5 sm:p-8 border border-[#C8B89A]/70 rounded-xl text-center bg-[#FFFDF9]/95 shadow-2xs">
                <User className="w-10 h-10 text-[#0A2A5E] mx-auto mb-2" />
                <h4 className="font-bold text-[#0A2A5E]">Solo Participation</h4>
                <p className="text-xs text-[#5A5A7A] max-w-md mx-auto mt-1 leading-relaxed">
                  You are registered for solo participation. No additional team members are needed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.keys(errors).some((k) => k.startsWith('member_')) && (
                  <div className="p-4 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800">Duplicate or Missing Information Detected:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-700">
                        {Array.from(new Set(Object.entries(errors)
                          .filter(([k]) => k.startsWith('member_'))
                          .map(([, msg]) => msg)))
                          .map((msg, idx) => (
                            <li key={idx}>{msg}</li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}

                {data.people.slice(1).map((member, idx) => {
                  const actualIndex = idx + 1;
                  const nameErr = errors[`member_${actualIndex}_name`];
                  const emailErr = errors[`member_${actualIndex}_email`];
                  const mobileErr = errors[`member_${actualIndex}_mobile`];
                  const yearErr = errors[`member_${actualIndex}_year`];
                  const instErr = errors[`member_${actualIndex}_institution`];
                  const deptErr = errors[`member_${actualIndex}_department`];

                  return (
                    <div
                      key={actualIndex}
                      className="p-4 sm:p-5 border border-[#C8B89A]/70 rounded-xl bg-[#FFFDF9]/95 shadow-2xs relative"
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-[#AA8246]/20 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                          Team Member #{actualIndex + 1}
                        </span>
                        {data.category === 'UG' && data.people.length <= 2 && actualIndex === 1 ? (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-300/60">
                            Required Teammate (Min 2)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeMember(actualIndex)}
                            className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1 hover:underline min-h-[44px] px-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                        {/* Full Name */}
                        <div>
                          <label className="block text-xs font-bold text-[#061838] mb-1.5">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name={`member_name_${actualIndex}`}
                            autoComplete="off"
                            value={member.name}
                            onChange={(e) => handleMemberChange(actualIndex, 'name', e.target.value)}
                            placeholder=""
                            className={`w-full px-4 py-3 rounded-xl border ${nameErr ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400' : 'border-[#C8B89A]/80 bg-white'} text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs`}
                          />
                          {nameErr && <p className="text-xs text-red-600 mt-1 font-medium">{nameErr}</p>}
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span>Email Address <span className="text-red-500">*</span></span>
                            <span className="text-[11px] font-medium text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300/60">
                              Use personal email ID
                            </span>
                          </label>
                          <input
                            type="email"
                            name={`member_email_${actualIndex}`}
                            autoComplete="off"
                            value={member.email}
                            onChange={(e) => handleMemberChange(actualIndex, 'email', e.target.value)}
                            placeholder="Enter member's personal email ID (e.g. member@gmail.com)"
                            className={`w-full px-4 py-3 rounded-xl border ${emailErr ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400' : 'border-[#C8B89A]/80 bg-white'} text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs`}
                          />
                          <p className="text-[11px] text-[#2D3142] mt-1 font-medium">
                            Please use a unique personal email ID for this member.
                          </p>
                          {emailErr && <p className="text-xs text-red-600 mt-1 font-medium">{emailErr}</p>}
                        </div>

                        {/* Mobile */}
                        <div>
                          <label className="block text-xs font-bold text-[#061838] mb-1.5">
                            WhatsApp Contact Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            name={`member_mobile_${actualIndex}`}
                            autoComplete="off"
                            value={member.mobile}
                            onChange={(e) =>
                              handleMemberChange(actualIndex, 'mobile', e.target.value.replace(/\D/g, ''))
                            }
                            placeholder=""
                            className={`w-full px-4 py-3 rounded-xl border ${mobileErr ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400' : 'border-[#C8B89A]/80 bg-white'} text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs`}
                          />
                          {mobileErr && <p className="text-xs text-red-600 mt-1 font-medium">{mobileErr}</p>}
                        </div>

                        {/* Academic Year */}
                        <div>
                          <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span>Current Year of Study <span className="text-red-500">*</span></span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Auto-filled from Leader (Editable)
                            </span>
                          </label>
                          <select
                            name={`member_year_${actualIndex}`}
                            value={member.year}
                            onChange={(e) => handleMemberChange(actualIndex, 'year', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border ${yearErr ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400' : 'border-[#C8B89A]/80 bg-white'} text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs`}
                          >
                            <option value="">Select Year of Study</option>
                            {yearOptionsFor(data.category, member.courseType || leader.courseType || 'Degree').map((y: string) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          {yearErr && <p className="text-xs text-red-600 mt-1 font-medium">{yearErr}</p>}
                        </div>

                        {/* College / Institution */}
                        <div>
                          <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span>College / Institute Name <span className="text-red-500">*</span></span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Auto-filled from Leader (Editable)
                            </span>
                          </label>
                          <input
                            type="text"
                            name={`member_institution_${actualIndex}`}
                            autoComplete="off"
                            value={member.institution}
                            onChange={(e) => handleMemberChange(actualIndex, 'institution', e.target.value)}
                            placeholder="College / Institute Name"
                            className={`w-full px-4 py-3 rounded-xl border ${instErr ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400' : 'border-[#C8B89A]/80 bg-white'} text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs`}
                          />
                          {instErr && <p className="text-xs text-red-600 mt-1 font-medium">{instErr}</p>}
                        </div>

                        {/* Department */}
                        <div>
                          <label className="block text-xs font-bold text-[#061838] mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span>Department / Branch <span className="text-red-500">*</span></span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Auto-filled from Leader (Editable)
                            </span>
                          </label>
                          <input
                            type="text"
                            name={`member_department_${actualIndex}`}
                            autoComplete="off"
                            value={member.department}
                            onChange={(e) => handleMemberChange(actualIndex, 'department', e.target.value)}
                            placeholder="Department / Branch"
                            className={`w-full px-4 py-3 rounded-xl border ${deptErr ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400' : 'border-[#C8B89A]/80 bg-white'} text-base sm:text-sm text-[#061838] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[46px] shadow-2xs`}
                          />
                          {deptErr && <p className="text-xs text-red-600 mt-1 font-medium">{deptErr}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Team Member Button below member cards */}
                {data.category === 'UG' && data.people.length < 4 && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={addMember}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0A2A5E] hover:bg-[#082046] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer min-h-[46px]"
                    >
                      <Plus className="w-4.5 h-4.5" /> Add Team Member ({data.people.length}/4)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 4: WHATSAPP COMMUNITY ================= */}
        {!isAssemblingQR && !isBuildingProfile && step === 4 && (
          <div className="step-transition-enter max-w-[740px] mx-auto">
            <div className="border-b border-[#AA8246]/35 pb-3 sm:pb-4 mb-6 text-center">
              <span className="text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider">
                Step 4 of 5 • WhatsApp Community
              </span>
              <h2 className="font-display text-xl sm:text-3xl font-bold text-[#061838]">
                Join the Official WhatsApp Community
              </h2>
              <p className="text-xs sm:text-sm text-[#2D3142] mt-1 max-w-xl mx-auto font-medium">
                Get instant updates, schedules, guidelines, and quick announcements directly on WhatsApp.
              </p>
            </div>

            {/* Embedded WhatsApp Component */}
            <CommunityQR className="max-w-2xl mx-auto" />
          </div>
        )}

        {/* ================= STEP 5: INNOVATION PASSPORT ISSUED ================= */}
        {!isAssemblingQR && !isBuildingProfile && step === 5 && (
          <div className="step-transition-enter max-w-[740px] mx-auto">
            <div className="border-b border-[#AA8246]/35 pb-3 sm:pb-4 mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#138808]/15 text-[#138808] text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" /> REGISTRATION COMPLETED!
              </div>
              <h2 className="font-display text-xl sm:text-4xl font-bold text-[#061838]">
                INSPIRE Official Event Pass
              </h2>
              <p className="text-xs sm:text-sm text-[#2D3142] mt-1 font-medium">
                You have successfully registered for INSPIRE Colloquium 2026.
              </p>
            </div>

            {/* Digital Passport Card with Stamp and Authentic Logos */}
            <div className="max-w-2xl mx-auto bg-[#FFFDF9] border-2 border-[#0A2A5E] rounded-2xl p-4 sm:p-8 shadow-xl relative overflow-hidden">
              {/* Gold Foil Bar at top */}
              <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#D4AF37] to-[#138808]" />

              {/* Postmark stamp seal */}
              <div className="absolute top-4 right-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-[#FF6B00] flex flex-col items-center justify-center rotate-12 select-none pointer-events-none opacity-85 shadow-xs">
                <span className="text-[8px] font-black tracking-widest text-[#FF6B00] uppercase">IEEE SLRTCE</span>
                <span className="text-xs sm:text-sm font-black text-[#0A2A5E]">INSPIRE</span>
                <span className="text-[9px] font-bold text-[#138808]">2026</span>
                <span className="text-[7px] text-gray-500 uppercase">COLLOQUIUM</span>
              </div>

              {/* Passport Header */}
              <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-[#0A2A5E]/20 pb-3 sm:pb-4 mb-4 sm:mb-6">
                <img src="/slrtce-logo.png" alt="SLRTCE" className="h-8 sm:h-10 w-auto object-contain" />
                <div className="h-8 w-px bg-gray-300" />
                <img src="/ieee-slrtce-logo.png" alt="IEEE" className="h-8 sm:h-10 w-auto object-contain" />
                <div className="ml-auto text-right pr-14 sm:pr-24">
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase block">Pass ID</span>
                  <span className="font-mono text-xs sm:text-sm font-black text-[#0A2A5E] tracking-wider">
                    {registrationId}
                  </span>
                </div>
              </div>

              {/* Passport Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs relative z-10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Team Leader / Participant</span>
                  <span className="font-bold text-sm text-[#0A2A5E]">{leader.name || 'Registered Participant'}</span>
                  <span className="text-gray-500 block text-[11px]">{leader.email}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Category</span>
                  <span className="font-bold text-sm text-[#FF6B00]">
                    {categoryDetails[data.category as keyof typeof categoryDetails]?.title || data.category}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {data.track && trackThemeImages[data.track]?.image && (
                    <img
                      src={trackThemeImages[data.track]?.image}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border border-[#C8B89A] shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Event Track</span>
                    <span className="font-bold text-[#0A2A5E] text-xs sm:text-sm">{data.track || 'Track'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">College / Institute Name</span>
                  <span className="font-bold text-[#0A2A5E]">{leader.institution || 'SLRTCE, Mumbai'}</span>
                </div>

                {data.category === 'UG' && data.team && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Team Name</span>
                    <span className="font-bold text-[#0A2A5E]">{data.team}</span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    {data.category === 'UG' ? 'Team Size' : 'Participation'}
                  </span>
                  <span className="font-bold text-[#0A2A5E]">
                    {data.category === 'UG' ? `${data.people.length} Member(s)` : 'Solo Participation'}
                  </span>
                </div>
              </div>

              {/* Co-Authors pill list - Only for UG teams */}
              {data.category === 'UG' && data.people.length > 1 && (
                <div className="mt-4 pt-3 border-t border-gray-200 relative z-10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Team Members</span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.people.slice(1).map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-gray-100 text-[#0A2A5E] text-[11px] font-semibold"
                      >
                        {p.name || `Member ${i + 2}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Passport Barcode Simulation */}
              <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 flex items-center justify-between relative z-10">
                <div className="space-y-0.5">
                  <div className="font-mono text-[9px] text-gray-400 tracking-widest">
                    INSPIRE-2026 // SLRTCE // OFFICIAL REGISTRATION
                  </div>
                  <div className="h-6 w-44 bg-[repeating-linear-gradient(90deg,#0A2A5E,#0A2A5E_2px,transparent_2px,transparent_4px,#0A2A5E_4px,#0A2A5E_7px,transparent_7px,transparent_8px)] opacity-70" />
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#138808]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified & Registered
                  </span>
                </div>
              </div>
            </div>

            {/* Dashboard Redirect CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 min-h-[48px]"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-2 border-[#0A2A5E] text-[#0A2A5E] font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-md transition-all active:scale-95 min-h-[48px]"
              >
                <FileText className="w-4 h-4" />
                <span>Submit Project Abstract</span>
              </Link>
            </div>
          </div>
        )}

        {/* ================= NAVIGATION FOOTER BUTTONS ================= */}
        {!isAssemblingQR && !isBuildingProfile && step > 1 && step < 5 && (
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[#AA8246]/35 flex items-center justify-between gap-3 max-w-[740px] mx-auto">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-3 sm:py-2.5 rounded-xl border border-[#C8B89A]/80 text-xs sm:text-sm font-bold text-[#0A2A5E] bg-[#FFFDF9]/90 hover:bg-white transition-all active:scale-95 min-h-[44px] shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setHasEntered(false)}
                className="text-xs font-semibold text-[#5A5A7A] hover:text-[#0A2A5E] transition-colors"
              >
                ← Return to Choice Screen
              </button>
            )}

            {firestoreError && (
              <div className="w-full mb-2 p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-700">
                {firestoreError}
              </div>
            )}

            <button
              type="button"
              onClick={nextStep}
              disabled={firestoreSaving}
              className="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] disabled:opacity-60 text-white text-xs sm:text-sm font-bold px-5 sm:px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 ml-auto min-h-[44px] cursor-pointer"
            >
              <span>{firestoreSaving ? 'Registering...' : (step === 4 ? 'Get My Event Pass' : 'Continue to Next Step')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default RegisterPage;
