import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadPassport, savePassport, getAuthUser, type Passport, type Abstract } from '../utils/storage';
import { uploadPPTFile, saveProjectSubmission, getUserSubmissions, type FirestoreSubmission } from '../lib/db';
import { tracks } from '../data/tracks';
import {
  Upload,
  FileText,
  CheckCircle2,
  ArrowRight,
  Download,
  Trash2,
  Sparkles,
  Info,
  Lock,
  Users,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

const trackThemeImages: Record<string, { image: string }> = {
  'AI & Machine Learning': { image: '/themes/ai_ml.jpg' },
  'Internet of Things': { image: '/themes/iot.jpg' },
  'Healthcare & MedTech': { image: '/themes/health.jpg' },
  'Sustainability & Green Technology': { image: '/themes/sustainability.jpg' },
  'Cybersecurity & Digital Trust': { image: '/themes/cybersecurity.jpg' },
  'Automation': { image: '/themes/automation.jpg' },
  'FinTech': { image: '/themes/fintech.jpg' },
  'Blockchain': { image: '/themes/blockchain.jpg' },
  'Emerging Technologies': { image: '/themes/emerging.jpg' },
};

export const SubmitPage: React.FC = () => {
  const [passport, setPassport] = useState<Passport>(() => loadPassport());
  const [user, setUser] = useState(() => getAuthUser());

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [existingSubmission, setExistingSubmission] = useState<(FirestoreSubmission & { id: string }) | null>(null);
  const [firestoreLoading, setFirestoreLoading] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const navigate = useNavigate();
  const category = (passport.category || user?.degree || '').toUpperCase();
  const isUG = category.includes('UG') || category.includes('UNDERGRADUATE') || category === 'DIPLOMA';

  useEffect(() => {
    const loaded = loadPassport();
    setPassport(loaded);
    const currentUser = getAuthUser();
    setUser(currentUser);

    if (currentUser?.id) {
      getUserSubmissions(currentUser.id).then((subs) => {
        if (subs && subs.length > 0) {
          setExistingSubmission(subs[0]);
        }
      }).catch(err => console.error("Error fetching user submissions:", err));
    }
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
            SUBMISSION ACCESS LOCKED
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">
            Registration Required
          </h2>

          <p className="font-sans text-sm text-[#5A5A7A] max-w-md mx-auto leading-relaxed mb-8">
            Extended abstract submissions are only open to registered teams with an active INSPIRE Colloquium 2026 Innovation Passport. Please complete team registration first.
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

  // Helper to validate whether a URL points to a real uploaded file
  const isValidSubmissionFileUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'Abstract Only' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'None' || trimmed === 'N/A') {
      return false;
    }
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:');
  };

  // If user has already submitted a presentation, render locked view with PPT view & evaluation status
  if (existingSubmission || (passport.abstracts && passport.abstracts.length > 0)) {
    const sub = existingSubmission;
    const localAbs = passport.abstracts[0];
    const rawPptUrl = sub?.pptLink || sub?.pdfLink || (localAbs && 'driveUrl' in localAbs ? (localAbs as any).driveUrl : '') || '';
    const hasValidPpt = isValidSubmissionFileUrl(rawPptUrl);
    const rawStatus = (sub?.evaluationStatus || 'PENDING').toUpperCase();

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border-2 border-[#C8B89A] p-6 sm:p-10 shadow-2xl space-y-6">
          {/* Header & Status Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#C8B89A]/40 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
                <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                SUBMISSION RECORD LOCKED
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E]">
                {hasValidPpt ? 'Presentation Already Submitted' : 'Submission Details & Status'}
              </h2>
            </div>

            {/* Live Evaluation Status Badge */}
            <div>
              {rawStatus === 'SELECTED' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs uppercase tracking-wider shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Selected for Colloquium Presentation
                </span>
              ) : rawStatus === 'REJECTED' ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs uppercase tracking-wider shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Not Shortlisted
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs uppercase tracking-wider shadow-sm animate-pulse">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Evaluation Pending
                </span>
              )}
            </div>
          </div>

          {/* Locked Notice */}
          <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#C8B89A] flex items-start gap-3">
            <Info className="w-5 h-5 text-[#FF6B00] shrink-0 mt-0.5" />
            <div className="text-xs text-[#5A5A7A] leading-relaxed">
              <strong className="text-[#0A2A5E] font-bold block mb-0.5">
                {hasValidPpt ? 'Presentation Upload Completed:' : 'Abstract Submission Received:'}
              </strong>
              {hasValidPpt
                ? 'Your presentation file and abstract details have been securely submitted for evaluation. To preserve review fairness, another submission cannot be uploaded.'
                : 'Your research abstract details have been securely recorded for evaluation. To preserve review fairness, another submission cannot be uploaded.'}
            </div>
          </div>

          {/* Submission Details */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E]">Research Title / Problem Statement</label>
              <p className="text-sm font-semibold text-[#0A2A5E] bg-[#FCF9F2] p-3.5 rounded-xl border border-[#C8B89A]/60 mt-1">
                {sub?.problemStatement || localAbs?.title || 'Submitted Presentation'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E]">Research Track</label>
                <p className="text-sm font-semibold text-[#0A2A5E] bg-[#FCF9F2] p-3 rounded-xl border border-[#C8B89A]/60 mt-1">
                  {sub?.track || passport.track || 'Selected Track'}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E]">Submission Timestamp</label>
                <p className="text-sm font-semibold text-[#0A2A5E] bg-[#FCF9F2] p-3 rounded-xl border border-[#C8B89A]/60 mt-1">
                  {sub?.createdAtIST || localAbs?.date || 'Recorded'}
                </p>
              </div>
            </div>

            {sub?.solutionSummary && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E]">Abstract / Solution Summary</label>
                <p className="text-xs text-[#5A5A7A] bg-[#FCF9F2] p-3.5 rounded-xl border border-[#C8B89A]/60 mt-1 leading-relaxed">
                  {sub.solutionSummary}
                </p>
              </div>
            )}

            {/* View Submitted Presentation - ONLY SHOW IF AN ACTUAL PRESENTATION FILE WAS SUBMITTED */}
            {hasValidPpt && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2A5E]">Submitted Presentation File</label>
                <div className="mt-1.5 p-4 rounded-2xl bg-white border-2 border-[#0A2A5E]/20 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0A2A5E] text-amber-400 flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0A2A5E]">
                        {localAbs?.filename || 'Presentation_File.pdf'}
                      </h4>
                      <span className="text-[11px] font-medium text-emerald-700">Uploaded & Verified in Database</span>
                    </div>
                  </div>

                  <a
                    href={rawPptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E65A00] text-white text-xs font-bold shadow-md transition-all shrink-0 active:scale-95"
                  >
                    <span>View Submitted Presentation</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#C8B89A]/40 text-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#0A2A5E] hover:text-[#FF6B00] transition-colors"
            >
              <span>Return to Participant Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [selectedTrack, setSelectedTrack] = useState<string>(() => passport.track || '');
  const trackInfo = tracks.find((t) => t.name === selectedTrack);
  const currentTrackTheme = selectedTrack && trackThemeImages[selectedTrack] ? trackThemeImages[selectedTrack] : null;

  const handleFileChange = (selected: File | null) => {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }

    // Validation: PPT, PPTX or PDF check
    const validExtensions = ['.ppt', '.pptx', '.pdf'];
    const hasValidExt = validExtensions.some((ext) => selected.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setFileError('Please attach a PPT, PPTX, or PDF presentation file.');
      setFile(null);
      return;
    }

    // Size limit: 25 MB
    if (selected.size > 25 * 1024 * 1024) {
      setFileError('File size exceeds the 25 MB threshold.');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const wordCount = summary.trim() ? summary.trim().split(/\s+/).length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Research Paper / Abstract Title is required.';
    }
    if (!selectedTrack) {
      errors.track = 'Please select a Research Track / Theme.';
    }

    const category = (passport.category || user?.degree || '').toUpperCase();
    const isUG = category.includes('UG') || category.includes('UNDERGRADUATE') || category === 'DIPLOMA';

    if (!summary.trim()) {
      errors.summary = 'Abstract text is required before submitting.';
    } else if (wordCount < 150) {
      errors.summary = `Abstract is too brief (${wordCount} words). Minimum required length is 150 words.`;
    } else if (wordCount > 250) {
      errors.summary = `Abstract exceeds 250 words (${wordCount} words). Maximum length is 250 words.`;
    }

    // PPT is mandatory only for UG category; optional or not required for PG / PPG
    if (isUG && !file) {
      errors.file = 'Please attach your presentation submission.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowWarning(true);
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setValidationErrors({});
    setShowWarning(false);
    setFirestoreError(null);

    const currentUser = user || getAuthUser();

    setFirestoreLoading(true);
    try {
      // 1. Upload PPT file to Firebase Storage if provided
      let pptLink = '';
      if (file && currentUser?.id) {
        pptLink = await uploadPPTFile(currentUser.id, file);
      }

      // 2. Build the local abstract record
      const newAbstract: Abstract = {
        id: `ABS-${Date.now().toString().slice(-6)}`,
        title: title.trim(),
        track: selectedTrack,
        filename: file ? file.name : 'Abstract_Only',
        size: file ? file.size : 0,
        date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      };

      // 3. Save to Firestore (n8n webhook triggers inside saveProjectSubmission only if isUG)
      if (currentUser?.id) {
        await saveProjectSubmission(currentUser.id, {
          teamName: passport.team || passport.people[0]?.name || currentUser.name,
          leaderName: passport.people[0]?.name || currentUser.name,
          collegeName: passport.people[0]?.institution || '',
          email: currentUser.email,
          track: selectedTrack,
          category: passport.category || currentUser.degree || 'PG',
          problemStatement: title.trim(),
          solutionSummary: summary.trim(),
          pptLink: pptLink || 'Abstract Only',
          secret: `SECRET-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          file: file || undefined,
        });
      }

      // 4. Update local passport cache
      const updatedPassport: Passport = {
        ...passport,
        track: selectedTrack,
        abstracts: [newAbstract],
      };
      savePassport(updatedPassport);
      setPassport(updatedPassport);

      // 5. Redirect to dashboard with success toast
      navigate('/dashboard', { state: { submissionSuccess: true } });
    } catch (err) {
      console.error('Submission error:', err);
      setFirestoreError('Upload failed. Please check your connection and try again.');
    } finally {
      setFirestoreLoading(false);
    }
  };

  const handleDeleteAbstract = (id: string) => {
    if (!confirm('Are you sure you want to withdraw this abstract filing?')) return;
    const updated: Passport = {
      ...passport,
      abstracts: passport.abstracts.filter((a) => a.id !== id),
    };
    savePassport(updated);
    setPassport(updated);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-14 w-full flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-10 w-full max-w-3xl mx-auto flex flex-col items-center bg-[#FAF6EE]/90 backdrop-blur-[2px] p-4 sm:p-6 rounded-2xl border border-[#C8B89A]/30 shadow-xs">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs sm:text-sm font-bold tracking-widest text-[#0A2A5E] uppercase mb-3">
          <Sparkles className="w-4 h-4 text-[#FF6B00]" />
          RESEARCH PORTAL · STAGE 1
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0A2A5E]">
          Submit Extended Abstract
        </h1>
        <p className="text-sm sm:text-base text-[#5A5A7A] max-w-2xl mx-auto mt-3 leading-relaxed">
          Upload your extended abstract articulating your research challenge, methodology, and innovation.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs">
          <Clock className="w-4 h-4 text-[#FF6B00]" />
          <span>Submission Deadline: 30th Sept 2026, 11:59 PM IST</span>
        </div>
      </div>

      {/* Single PPT Limit Notice */}
      {passport.abstracts && passport.abstracts.length >= 1 && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-500 text-amber-950 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-[#0A2A5E]">
                1 Submission Already Filed
              </p>
              <p className="text-sm text-[#5A5A7A] mt-1">
                Current active submission: <strong>{passport.abstracts[0].title}</strong> ({passport.abstracts[0].filename}).
                Submitting again will replace your current submission.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-bold text-white bg-[#0A2A5E] hover:bg-[#082046] px-4 py-2.5 rounded-xl shrink-0 inline-flex items-center justify-center"
          >
            Dashboard →
          </Link>
        </div>
      )}

      {/* Main Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl space-y-7 sm:space-y-8"
      >
        {/* Prominent Red Warning Alert */}
        {showWarning && (
          <div className="p-5 sm:p-6 rounded-2xl bg-red-50/95 border-2 border-red-500 text-red-900 flex items-start gap-4 shadow-lg animate-in fade-in duration-200">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-base font-bold text-red-900">
                Action Required: Please complete required fields before submitting:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 font-semibold space-y-1 mt-1">
                {validationErrors.title && <li>{validationErrors.title}</li>}
                {validationErrors.track && <li>{validationErrors.track}</li>}
                {validationErrors.summary && <li>{validationErrors.summary}</li>}
                {validationErrors.file && <li>{validationErrors.file}</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Paper Title */}
        <div>
          <label className="block text-sm font-extrabold uppercase tracking-wider text-[#0A2A5E] mb-2">
               Abstract Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationErrors.title) {
                setValidationErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.title;
                  return copy;
                });
              }
            }}
            placeholder="Enter full paper or research title"
            className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-semibold ${
              validationErrors.title ? 'border-red-500 bg-red-50/30 ring-2 ring-red-400' : 'border-[#C8B89A] bg-white'
            } focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] transition-all`}
          />
          {validationErrors.title && (
            <p className="text-xs sm:text-sm text-red-600 mt-1.5 font-bold">{validationErrors.title}</p>
          )}
        </div>

        {/* Research Track / Theme Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-extrabold uppercase tracking-wider text-[#0A2A5E]">
              Research Track / Theme <span className="text-red-500">*</span>
            </label>
            <span className="text-xs sm:text-sm text-gray-600 font-bold">9 Sustainable Research Themes</span>
          </div>

          <div
            className={`p-5 rounded-2xl bg-white border-2 ${
              validationErrors.track ? 'border-red-500 ring-2 ring-red-400 bg-red-50/20' : 'border-[#C8B89A]'
            } shadow-sm space-y-4`}
          >
            <select
              value={selectedTrack}
              onChange={(e) => {
                setSelectedTrack(e.target.value);
                if (validationErrors.track) {
                  setValidationErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.track;
                    return copy;
                  });
                }
              }}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-[#C8B89A] bg-white text-base font-bold text-[#0A2A5E] focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] min-h-[48px]"
            >
              <option value="">-- Select Your Research Theme / Track --</option>
              {tracks.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} (UN-SDG: {t.sdg})
                </option>
              ))}
            </select>
            {validationErrors.track && (
              <p className="text-xs sm:text-sm text-red-600 mt-1 font-bold">{validationErrors.track}</p>
            )}

            {selectedTrack && currentTrackTheme && (
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                <img
                  src={currentTrackTheme.image}
                  alt={selectedTrack}
                  className="w-14 h-14 rounded-xl object-cover border border-[#C8B89A] shadow-xs shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-[#0A2A5E]">
                      {selectedTrack}
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#138808]/15 text-[#138808] border border-[#138808]/30">
                      ✓ Selected Theme
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5A5A7A] mt-1 font-medium">
                    "{trackInfo?.short || 'Universal'}" • UN-SDG: {trackInfo?.sdg || 'Universal'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Authors & Teammates (Read-Only) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-extrabold uppercase tracking-wider text-[#0A2A5E] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF6B00]" />
              <span>Authors & Teammates</span>
            </label>
          </div>

          <div className="bg-white border-2 border-[#C8B89A] rounded-2xl p-5 shadow-xs">
            {passport.people && passport.people.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {passport.people.map((person, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#C8B89A]/60 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0A2A5E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {person.name ? person.name.charAt(0).toUpperCase() : idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#0A2A5E] truncate">
                          {person.name || (idx === 0 ? 'Lead Author' : `Member ${idx + 1}`)}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B00]/15 text-[#FF6B00]">
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5A5A7A] truncate mt-0.5">
                        {person.department || 'Department'}{person.institution ? ` • ${person.institution}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                        {person.email || person.mobile}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#5A5A7A] italic">No authors registered yet.</p>
            )}
          </div>
        </div>

        {/* Abstract */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-extrabold uppercase tracking-wider text-[#0A2A5E]">
              Abstract <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-xs sm:text-sm font-mono font-bold ${
                wordCount >= 150 && wordCount <= 250
                  ? 'text-[#138808]'
                  : wordCount > 250
                  ? 'text-red-600'
                  : 'text-[#5A5A7A]'
              }`}
            >
              {wordCount} / 150–250 words
            </span>
          </div>
          <textarea
            rows={6}
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (validationErrors.summary) {
                setValidationErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.summary;
                  return copy;
                });
              }
            }}
            placeholder="Provide a comprehensive abstract (150–250 words) concisely articulating the research challenge, proposed novelty/methodology, experimental results, and alignment towards the Viksit Bharat 2047 national framework..."
            className={`w-full px-4 py-3.5 rounded-xl border-2 text-base ${
              validationErrors.summary
                ? 'border-red-500 bg-red-50/30 ring-2 ring-red-400'
                : 'border-[#C8B89A] bg-white'
            } focus:outline-none focus:ring-2 focus:ring-[#0A2A5E] leading-relaxed font-medium`}
          />
          {validationErrors.summary && (
            <p className="text-xs sm:text-sm text-red-600 mt-1.5 font-bold">{validationErrors.summary}</p>
          )}
          <p className="text-xs sm:text-sm text-[#5A5A7A] mt-1.5 italic">
            Recommended length is between 150 and 250 words for preliminary editorial review.
          </p>
        </div>

        {/* PPT File Dropzone — UG/Diploma only */}
        {isUG && (
          <div>
            <label className="block text-sm font-extrabold uppercase tracking-wider text-[#0A2A5E] mb-2">
              Attach Presentation File <span className="text-red-500">* (Mandatory for UG)</span>
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all cursor-pointer relative bg-white ${
                validationErrors.file
                  ? 'border-red-500 bg-red-50/20 ring-2 ring-red-400'
                  : isDragging
                  ? 'border-[#FF6B00] bg-[#FF6B00]/5 scale-[1.01]'
                  : file
                  ? 'border-[#138808] bg-green-50/30'
                  : 'border-[#C8B89A] hover:border-[#0A2A5E]'
              }`}
              onClick={() => document.getElementById('abstract-file-input')?.click()}
            >
              <input
                id="abstract-file-input"
                type="file"
                accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                    if (validationErrors.file) {
                      setValidationErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.file;
                        return copy;
                      });
                    }
                  }
                }}
              />

              {file ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-base text-[#0A2A5E]">{file.name}</h4>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 font-mono">
                    {(file.size / 1024).toFixed(1)} KB • Presentation Attached
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-3 text-xs sm:text-sm text-red-600 hover:underline font-bold"
                  >
                    Remove or Choose Another File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#FAF6EE] border border-[#C8B89A] flex items-center justify-center text-[#0A2A5E] mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-base font-bold text-[#0A2A5E]">
                    Drag &amp; Drop your presentation here, or <span className="text-[#FF6B00] underline">browse</span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                    Attach your presentation (.ppt, .pptx, or .pdf) • Maximum file size 25 MB
                  </p>
                </div>
              )}
            </div>

            {validationErrors.file && (
              <p className="text-xs sm:text-sm text-red-600 mt-2 font-bold">{validationErrors.file}</p>
            )}
            {fileError && <p className="text-xs sm:text-sm text-red-600 mt-2 font-bold">{fileError}</p>}
          </div>
        )}

        {/* Formatting Guideline Callout */}
        <div className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#C8B89A] flex items-start gap-3.5 text-xs sm:text-sm text-[#5A5A7A]">
          <Info className="w-5 h-5 text-[#0A2A5E] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-[#0A2A5E] block font-bold text-sm sm:text-base">Submission Requirements:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-xs sm:text-sm font-medium">
              <li><strong>Word Count:</strong> Abstract must be between 150 and 250 words.</li>
              {isUG
                ? <li><strong>UG / Diploma:</strong> PPT/PDF presentation is mandatory alongside the abstract.</li>
                : <li><strong>PG / PPG:</strong> Submit your extended abstract directly — no presentation file required.</li>}
              {isUG && <li>Supported file formats: PPT, PPTX, or PDF presentation (maximum 25 MB).</li>}
            </ul>
          </div>
        </div>

        {/* Submit warning alert callout if missing fields */}
        {showWarning && (
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold text-red-800 shadow-sm animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Cannot submit: Please complete required Title, Track, and Abstract fields above.</span>
          </div>
        )}

        {/* Firestore error */}
        {firestoreError && (
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold text-red-800 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{firestoreError}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-[#C8B89A]/50">
          <Link
            to="/dashboard"
            className="text-sm font-bold text-[#5A5A7A] hover:text-[#0A2A5E]"
          >
            ← Cancel and Return to Dashboard
          </Link>

          <button
            type="submit"
            disabled={firestoreLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-base px-9 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer min-h-[48px]"
          >
            {firestoreLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Submitting…</span>
              </>
            ) : (
              <>
                <span>
                  {passport.abstracts && passport.abstracts.length >= 1
                    ? 'Update Submission'
                    : 'Submit Abstract'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Existing Abstract Filings List */}
      {passport.abstracts && passport.abstracts.length > 0 && (
        <div className="mt-12">
          <h3 className="font-display text-2xl font-bold text-[#0A2A5E] mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#FF6B00]" />
            <span>Previously Filed Submissions ({passport.abstracts.length})</span>
          </h3>

          <div className="space-y-4">
            {passport.abstracts.map((abs) => (
              <div
                key={abs.id}
                className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-500">{abs.id}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Under Evaluation
                    </span>
                  </div>
                  <h4 className="font-bold text-base sm:text-lg text-[#0A2A5E] mt-1">{abs.title}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 mt-1 font-medium">
                    <span>Track: <strong className="text-[#0A2A5E]">{abs.track}</strong></span>
                    <span>File: <span className="font-mono">{abs.filename}</span></span>
                    <span>Date: {abs.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => alert(`Previewing recorded filing: ${abs.filename} (${abs.id})`)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl border border-[#C8B89A] bg-white text-[#0A2A5E] hover:bg-gray-50 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAbstract(abs.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                    title="Withdraw filing"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitPage;
