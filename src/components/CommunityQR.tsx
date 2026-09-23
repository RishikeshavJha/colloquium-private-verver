import React, { useState } from 'react';
import { WHATSAPP_LINK } from '../utils/storage';
import { MessageCircle, Check, Copy, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

interface CommunityQRProps {
  className?: string;
}

export const CommunityQR: React.FC<CommunityQRProps> = ({ className = '' }) => {
  const [copied, setCopied] = useState(false);
  const [settleKey, setSettleKey] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(WHATSAPP_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const reTriggerSettle = () => {
    setSettleKey((prev) => prev + 1);
  };

  return (
    <div
      className={`relative bg-[#FAF6EE] border-2 border-[#C8B89A] rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 text-[#0A2A5E] ${className}`}
      style={{
        backgroundImage: "radial-gradient(#C8B89A 0.75px, transparent 0.75px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* Decorative Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A2A5E]/5 border border-[#0A2A5E]/15 text-[10px] font-bold tracking-wider uppercase text-[#0A2A5E]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#25D366]" />
        <span>Official Channel</span>
      </div>

      {/* Postmark Header */}
      <div className="text-center mb-4 mt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FF9933]/15 text-[#FF6B00] text-[11px] font-bold tracking-widest uppercase mb-1">
          <Sparkles className="w-3 h-3" /> OFFICIAL WHATSAPP CHANNEL
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#0A2A5E]">
          Join the WhatsApp Channel
        </h3>
        <p className="text-xs sm:text-sm text-[#0A2A5E]/75 max-w-md mx-auto mt-1">
          Get quick updates, schedules, problem statements, and connect with other participants.
        </p>
      </div>

      {/* QR Code Frame with Settling Animation */}
      <div className="flex flex-col items-center justify-center my-4 relative select-none">
        {/* Shockwave Halo Pulse when QR settles */}
        <div
          key={`pulse-${settleKey}`}
          className="absolute w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-2xl border-2 border-[#0A2A5E]/20 animate-settle-pulse pointer-events-none"
        />

        <div
          key={`settle-${settleKey}`}
          onClick={reTriggerSettle}
          title="Click to re-animate the QR code"
          className="relative p-4 rounded-xl bg-white border-2 border-dashed border-[#0A2A5E]/40 shadow-xl group animate-qr-settle cursor-pointer hover:shadow-2xl transition-shadow duration-300"
        >
          {/* Top Postmark Stamp */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0A2A5E] text-white text-[9px] font-bold px-3 py-0.5 rounded-full shadow-md tracking-wider uppercase z-20">
            SCAN WITH PHONE
          </div>

          <div className="relative w-[180px] h-[180px] sm:w-[210px] sm:h-[210px] rounded-lg overflow-hidden flex items-center justify-center bg-[#FAF6EE] shadow-inner">
            {/* 4 Optical Alignment Corner Brackets */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#FF6B00] z-10" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#FF6B00] z-10" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#FF6B00] z-10" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#FF6B00] z-10" />

            {/* Glowing Laser Scan Sweep Line */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#25D366] to-transparent shadow-[0_0_8px_#25D366] pointer-events-none z-10 animate-scan-sweep" />

            {/* Actual WhatsApp Channel QR Image */}
            <img
              src="/whatsapp-channel-qr.jpeg"
              alt="INSPIRE Colloquium 2026 WhatsApp Channel QR Code"
              className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Heritage seal stamp mark */}
          <div className="absolute -bottom-3 right-2 bg-[#D4AF37] text-[#0A2A5E] text-[9px] font-black px-2.5 py-0.5 rounded shadow border border-[#0A2A5E]/20 animate-stamp-imprint z-20">
            IEEE SLRTCE 2026
          </div>
        </div>

        <span className="text-[10px] text-[#5A5A7A] mt-2 font-medium tracking-wide">
          ✦ Scan with your phone or click button below
        </span>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 min-h-[44px]"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>Join WhatsApp Channel</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>

        <button
          onClick={handleCopy}
          type="button"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-[#C8B89A] text-[#0A2A5E] font-semibold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-sm hover:shadow transition-all active:scale-95 min-h-[44px]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-bold">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#0A2A5E]/70" />
              <span>Copy Channel Link</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Info */}
      <p className="text-[11px] text-center text-[#0A2A5E]/60 mt-4">
        Channel link: <span className="font-mono text-[10px] break-all text-[#0A2A5E]/80">{WHATSAPP_LINK}</span>
      </p>
    </div>
  );
};

export default CommunityQR;
