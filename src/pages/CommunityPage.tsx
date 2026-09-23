import React from 'react';
import CommunityQR from '../components/CommunityQR';
import {
  Bell,
  Users,
  HelpCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const CommunityPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 w-full flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-8 w-full max-w-2xl mx-auto flex flex-col items-center bg-[#FAF6EE]/90 backdrop-blur-[2px] p-4 sm:p-6 rounded-2xl border border-[#C8B89A]/30 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
          <Sparkles className="w-3 h-3 text-[#FF6B00]" />
          OFFICIAL PARTICIPANT NETWORK
        </div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-5xl font-extrabold text-[#0A2A5E]">
          INSPIRE Colloquium WhatsApp Channel Hub
        </h1>
        <p className="text-xs sm:text-sm text-[#5A5A7A] max-w-xl mx-auto mt-2">
          Real-time coordination channel connecting authors, mentors, jury panels, and the IEEE SLRTCE organizing committee.
        </p>
      </div>

      {/* Main QR Card */}
      <div className="mb-10">
        <CommunityQR />
      </div>

      {/* Benefits / Channels Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10">
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mb-3">
            <Bell className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#0A2A5E] mb-1">Official Circulars</h4>
          <p className="text-xs text-[#5A5A7A] leading-relaxed">
            Instant alerts regarding abstract scrutiny results, presentation time slots, and schedule updates directly from organizing chairs.
          </p>
        </div>

        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#0A2A5E]/10 text-[#0A2A5E] flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#0A2A5E] mb-1">Mentor AMAs</h4>
          <p className="text-xs text-[#5A5A7A] leading-relaxed">
            Direct access to senior professors, IEEE mentors, and past winners to fine-tune your camera-ready papers and presentation slides.
          </p>
        </div>

        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#138808]/10 text-[#138808] flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-[#0A2A5E] mb-1">Spot Support</h4>
          <p className="text-xs text-[#5A5A7A] leading-relaxed">
            Dedicated student branch convenors available 24/7 to resolve queries regarding accommodation, travel desk, and campus logistics.
          </p>
        </div>
      </div>

      {/* FAQ on WhatsApp Network */}
      <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-8 shadow-sm">
        <h3 className="font-display text-xl font-bold text-[#0A2A5E] mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#FF6B00]" />
          <span>Frequently Asked Questions</span>
        </h3>

        <div className="space-y-4 text-xs text-[#5A5A7A]">
          <div className="border-b border-[#C8B89A]/30 pb-3">
            <h4 className="font-bold text-sm text-[#0A2A5E] mb-1">
              Is joining the WhatsApp channel mandatory?
            </h4>
            <p className="leading-relaxed">
              While email notifications are sent for formal decisions, urgent announcements, slot allocations, and immediate changes are dispatched via WhatsApp first. At least one member from each team must be in the channel.
            </p>
          </div>

          <div className="border-b border-[#C8B89A]/30 pb-3">
            <h4 className="font-bold text-sm text-[#0A2A5E] mb-1">
              Can multiple team members join the group?
            </h4>
            <p className="leading-relaxed">
              Yes! All registered participants, team members, and mentors are welcome to join using the channel link.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#0A2A5E] mb-1">
              What is the code of conduct in the channel?
            </h4>
            <p className="leading-relaxed">
              Maintain professional decorum. The group is strictly for research discussions, event queries, and official communication. Spamming or unverified promotions will lead to immediate removal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
