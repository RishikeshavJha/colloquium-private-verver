import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { loadPassport, getAuthUser } from '../utils/storage';
import { getUserSubmissions, submitPaymentProof, type FirestoreSubmission } from '../lib/db';
import { useInspireBackground } from '../context/InspireBackgroundContext';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  AlertCircle,
  Lock,
  ArrowRight,
  ImageIcon,
  Loader2,
  Banknote,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';

import paymentQrImg from '../Payment QR.jpeg';

const REGISTRATION_FEE = 300;
const UPI_ID = 'vyapar.171761648790@hdfcbank';
const ACCOUNT_HOLDER = 'SLRTCE IEEE SB';

export const PaymentPage: React.FC = () => {
  useInspireBackground('quiet');
  const passport = loadPassport();
  const user = getAuthUser();

  const [selectedSubmission, setSelectedSubmission] = useState<(FirestoreSubmission & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [txnId, setTxnId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const registrationId = `INSPIRE-2026-${((passport.people?.[0]?.name || passport.team || 'PASS'))
    .slice(0, 3)
    .toUpperCase()}-${Math.abs(
    (passport.people?.[0]?.email || 'slrtce').split('').reduce((acc, char) => acc + char.charCodeAt(0), 1000)
  ).toString().slice(0, 4)}`;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getUserSubmissions(user.id).then(subs => {
      const sel = subs.find(s => s.evaluationStatus === 'SELECTED');
      setSelectedSubmission(sel || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const payStatus = selectedSubmission?.paymentStatus || 'NOT_PAID';
  const isUnlocked = !!passport.registered;

  // ── Guard: not registered ───────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border-2 border-[#C8B89A] p-8 sm:p-12 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#0A2A5E] text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
            PAYMENT ACCESS LOCKED
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">Registration Required</h2>
          <p className="font-sans text-sm text-[#5A5A7A] max-w-md mx-auto leading-relaxed mb-8">
            Payment is only available for registered and shortlisted participants. Please complete registration first.
          </p>
          <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95">
            Complete Registration <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Guard: not selected ─────────────────────────────────────────────────────
  if (!loading && !selectedSubmission) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#FFFDF9] rounded-3xl border-2 border-[#C8B89A] p-8 sm:p-12 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Clock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
            PAYMENT NOT YET UNLOCKED
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">Awaiting Selection</h2>
          <p className="font-sans text-sm text-[#5A5A7A] max-w-md mx-auto leading-relaxed mb-8">
            The payment page unlocks once your abstract has been reviewed and you've been shortlisted for the INSPIRE Colloquium 2026 presentation round. Check your dashboard for updates.
          </p>
          <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 bg-[#0A2A5E] hover:bg-[#0d3570] text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Already paid / under review ─────────────────────────────────────────────
  if (!loading && (payStatus === 'PAID' || payStatus === 'UNDER_REVIEW')) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 w-full">
        <div className="bg-[#FFFDF9] rounded-3xl border-2 border-[#138808] p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-[#138808] to-emerald-500" />
          <div className="relative mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${payStatus === 'PAID' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
              {payStatus === 'PAID'
                ? <ShieldCheck className="w-10 h-10 text-[#138808]" />
                : <Clock className="w-10 h-10 text-blue-600" />}
            </div>
            <div className={`absolute inset-0 rounded-full animate-ping ${payStatus === 'PAID' ? 'bg-emerald-400/20' : 'bg-blue-400/20'}`} style={{ width: 80, height: 80, margin: 'auto' }} />
          </div>
          <span className={`inline-block px-3 py-1 font-bold text-xs rounded-full uppercase tracking-wider mb-3 ${payStatus === 'PAID' ? 'bg-emerald-100 text-emerald-900' : 'bg-blue-100 text-blue-900'}`}>
            {payStatus === 'PAID' ? 'Payment Verified' : 'Under Verification'}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">
            {payStatus === 'PAID' ? 'Slot Confirmed! 🎉' : 'Payment Submitted!'}
          </h2>
          <p className="text-sm text-[#5A5A7A] leading-relaxed mb-8 max-w-md mx-auto">
            {payStatus === 'PAID'
              ? 'Your registration fee has been verified and your presentation slot is officially confirmed. See you at INSPIRE Colloquium 2026!'
              : 'Your payment proof has been received. The organizing committee will verify your transaction within 24–48 hours and confirm your slot via email.'}
          </p>
          <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 bg-[#0A2A5E] hover:bg-[#0d3570] text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!txnId.trim()) { setError('Please enter your Transaction / UTR ID.'); return; }
    if (!screenshot) { setError('Please upload a screenshot of your payment.'); return; }
    if (!user?.id || !selectedSubmission?.id) { setError('Session error. Please refresh and try again.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitPaymentProof(user.id, selectedSubmission.id, txnId, screenshot);
      setSubmitted(true);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to submit. Please try again or contact the organiser.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 w-full">
        <div className="bg-[#FFFDF9] rounded-3xl border-2 border-[#138808] p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-[#138808] to-emerald-500" />
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10 text-[#138808]" />
            </div>
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" style={{ width: 80, height: 80, margin: 'auto' }} />
          </div>
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 font-bold text-xs rounded-full uppercase tracking-wider mb-3">
            Payment Under Verification
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2A5E] mb-3">Payment Submitted!</h2>
          <p className="text-sm text-[#5A5A7A] leading-relaxed mb-8 max-w-md mx-auto">
            Your payment proof has been received. The organizing committee will verify your transaction within <strong>24–48 hours</strong> and confirm your presentation slot via email.
          </p>
          <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 bg-[#0A2A5E] hover:bg-[#0d3570] text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg transition-all active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Main payment form ───────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">

      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black uppercase tracking-wider mb-3">
          <CreditCard className="w-3.5 h-3.5" /> Shortlisted · Registration Fee
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0A2A5E] leading-tight">
          Registration Fee Payment
        </h1>
        <p className="text-sm text-[#5A5A7A] mt-1.5 leading-relaxed max-w-2xl">
          Complete the payment to confirm your presentation slot at INSPIRE Colloquium 2026. Payment must be submitted within{' '}
          <span className="font-bold text-rose-600">24 hours of selection</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: UPI Details ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Pass / category info */}
          <div className="bg-[#FFFDF9] border-2 border-[#C8B89A] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0A2A5E] text-amber-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-[#0A2A5E] uppercase tracking-wider">Your Registration</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-[#C8B89A]/30">
                <span className="text-gray-500 font-semibold uppercase tracking-wider">Pass ID</span>
                <span className="font-mono font-bold text-[#0A2A5E]">{registrationId}</span>
              </div>
              {passport.team && (
                <div className="flex justify-between items-center py-2 border-b border-[#C8B89A]/30">
                  <span className="text-gray-500 font-semibold uppercase tracking-wider">Team Name</span>
                  <span className="font-bold text-[#0A2A5E] text-right max-w-[55%]">{passport.team}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-[#C8B89A]/30">
                <span className="text-gray-500 font-semibold uppercase tracking-wider">Category</span>
                <span className="font-bold text-[#FF6B00]">{passport.category === 'UG' ? 'UG / Diploma' : passport.category}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#C8B89A]/30">
                <span className="text-gray-500 font-semibold uppercase tracking-wider">Track</span>
                <span className="font-bold text-[#0A2A5E] text-right max-w-[55%]">{selectedSubmission?.track || 'Ideathon Track'}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500 font-semibold uppercase tracking-wider">Amount Due</span>
                <span className="text-lg font-black text-[#138808]">₹{REGISTRATION_FEE}</span>
              </div>
            </div>
          </div>

          {/* UPI Payment Details */}
          <div className="bg-[#FFFDF9] border-2 border-[#C8B89A] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#138808] flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-[#0A2A5E] uppercase tracking-wider">Pay Via UPI</span>
            </div>

            <div className="space-y-4">
              {/* Payment QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-[#C8B89A]/40 shadow-inner">
                <img
                  src={paymentQrImg}
                  alt="Payment QR Code"
                  className="w-48 sm:w-52 h-auto object-contain rounded-lg border border-gray-200 shadow-sm"
                />
                <span className="mt-2 text-[11px] font-semibold text-[#138808] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-center">
                  Scan QR with GPay / PhonePe / Paytm / Any UPI App
                </span>
              </div>

              {/* UPI ID with copy */}
              <div className="p-3 rounded-xl bg-[#0A2A5E]/5 border border-[#0A2A5E]/15">
                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">UPI ID</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#0A2A5E] text-sm select-all">{UPI_ID}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(UPI_ID);
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="shrink-0 p-1.5 rounded-lg bg-[#0A2A5E]/10 hover:bg-[#0A2A5E]/20 transition-colors"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-[#138808]" /> : <Copy className="w-3.5 h-3.5 text-[#0A2A5E]" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Holder</span>
                  <span className="font-bold text-[#0A2A5E]">{ACCOUNT_HOLDER}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Amount</span>
                  <span className="font-black text-[#138808] text-sm">₹{REGISTRATION_FEE}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong className="block mb-1">📌 Important: Add remark while paying</strong>
                Use your Pass ID <span className="font-mono font-bold select-all">{registrationId}</span> as the payment remark / note so we can identify your payment.
              </div>
            </div>
          </div>

          {/* Deadline warning */}
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-xs text-rose-900 leading-relaxed">
            <strong className="text-rose-700 block mb-1">⏰ 24-Hour Deadline</strong>
            Payment must be completed and proof submitted within <strong>24 hours of your selection notification</strong>. Slots not confirmed in time may be reallocated.
          </div>
        </div>

        {/* ── Right: Upload Form ────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-[#FFFDF9] border-2 border-[#C8B89A] rounded-2xl p-5 sm:p-7 shadow-sm">

            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#C8B89A]/40">
              <div className="w-8 h-8 rounded-lg bg-[#138808] text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#0A2A5E] block">Submit Payment Proof</span>
                <span className="text-xs text-[#5A5A7A]">Fill in your transaction details after completing the payment</span>
              </div>
            </div>

            {/* Step 1: Transaction ID */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#0A2A5E] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                <label className="text-xs font-bold text-[#0A2A5E] uppercase tracking-wider">
                  Transaction / UTR ID <span className="text-rose-500">*</span>
                </label>
              </div>
              <input
                type="text"
                value={txnId}
                onChange={e => { setTxnId(e.target.value); setError(''); }}
                placeholder="e.g. 423100876543"
                className="w-full border-2 border-[#C8B89A] focus:border-[#138808] rounded-xl px-4 py-3 text-sm font-mono text-[#0A2A5E] bg-white outline-none transition-colors placeholder:text-gray-300"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">Found in your UPI app's transaction history or bank SMS.</p>
            </div>

            {/* Step 2: Screenshot */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#0A2A5E] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <label className="text-xs font-bold text-[#0A2A5E] uppercase tracking-wider">
                  Payment Screenshot <span className="text-rose-500">*</span>
                </label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setScreenshot(f);
                  setError('');
                  if (f) {
                    const reader = new FileReader();
                    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
                    reader.readAsDataURL(f);
                  } else {
                    setScreenshotPreview(null);
                  }
                }}
              />

              {screenshotPreview ? (
                <div
                  className="relative rounded-xl overflow-hidden border-2 border-[#138808] cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src={screenshotPreview} alt="Payment screenshot" className="w-full h-52 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold text-sm bg-black/60 px-4 py-2 rounded-full">Click to change</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-[#138808] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#C8B89A] hover:border-[#138808] rounded-xl py-10 flex flex-col items-center justify-center gap-3 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <ImageIcon className="w-7 h-7 text-[#138808]" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-[#5A5A7A] group-hover:text-[#0A2A5E] block transition-colors">Click to upload payment screenshot</span>
                    <span className="text-xs text-gray-400 mt-0.5 block">JPG, PNG, WEBP — max 10 MB</span>
                  </div>
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 px-5 rounded-xl bg-[#138808] hover:bg-[#0e6806] text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting Payment Proof…</>
              ) : (
                <><ShieldCheck className="w-5 h-5" /> Submit Payment Proof · ₹{REGISTRATION_FEE}</>
              )}
            </button>

            <p className="text-center text-[10px] text-gray-400 mt-3 leading-relaxed">
              By submitting, you confirm the payment was made from your own account. For support, contact{' '}
              <a href="mailto:colloquium.ieee@slrtce.in" className="text-[#0A2A5E] font-semibold hover:underline">colloquium.ieee@slrtce.in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
