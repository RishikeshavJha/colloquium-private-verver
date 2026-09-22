import React from 'react';
import { Link } from 'react-router-dom';
import { criteria } from '../data/tracks';
import {
  CheckCircle2,
  FileText,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const GuidelinesPage: React.FC = () => {
  const totalPoints = criteria.reduce((acc, [, pts]) => acc + pts, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2A5E]/10 border border-[#C8B89A] text-xs font-bold tracking-widest text-[#0A2A5E] uppercase mb-2">
          <Sparkles className="w-3 h-3 text-[#FF6B00]" />
          OFFICIAL CONCLAVE COMPENDIUM
        </div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-5xl font-extrabold text-[#0A2A5E]">
          Conference Guidelines & Evaluation Framework
        </h1>
        <p className="text-xs sm:text-sm text-[#5A5A7A] max-w-2xl mx-auto mt-2">
          Comprehensive eligibility criteria, formatting benchmarks, review parameters, and ethical codes for INSPIRE Colloquium 2026.
        </p>
      </div>

      {/* 100-Point Evaluation Framework Section */}
      <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-4 sm:p-10 shadow-xl mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C8B89A]/40 pb-3 sm:pb-4 mb-4 sm:mb-6">
          <div>
            <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">Jury Benchmarks</span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0A2A5E]">
              100-Point Comprehensive Assessment Matrix
            </h2>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-extrabold text-[#0A2A5E]">{totalPoints}</span>
            <span className="text-xs text-gray-500 block uppercase font-bold">Total Max Score</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#5A5A7A] mb-6">
          Every submission is evaluated by an independent double-blind jury consisting of senior IEEE members, doctoral faculty, and industry practitioners across the following quantitative dimensions:
        </p>

        {/* Criteria Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criteria.map(([name, points]) => {
            const percentage = (points / totalPoints) * 100;
            return (
              <div
                key={name}
                className="p-4 rounded-xl bg-white border border-[#C8B89A] shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs sm:text-sm text-[#0A2A5E]">{name}</span>
                  <span className="font-mono text-xs font-black text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded">
                    {points} Points
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0A2A5E] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage * 4}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1.5 self-end">{percentage}% of total weightage</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules & Guidelines Detailed Cards */}
      <div className="space-y-6 mb-10">
        {/* Eligibility Criteria */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-display text-xl font-bold text-[#0A2A5E] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF6B00]" />
            <span>Eligibility & Participation Categories</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#5A5A7A]">
            <div className="p-4 rounded-xl bg-white border border-[#C8B89A]/50">
              <span className="font-bold text-sm text-[#0A2A5E] block mb-1">UG / Diploma</span>
              <p className="leading-relaxed">
                Open to students currently pursuing B.E., B.Tech, B.Sc, BCA or equivalent diplomas. Teams may comprise <strong>1 to 4 members</strong> from any accredited university. Cross-college teams are permitted.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#C8B89A]/50">
              <span className="font-bold text-sm text-[#0A2A5E] block mb-1">Postgraduate (PG)</span>
              <p className="leading-relaxed">
                Open to candidates enrolled in M.E., M.Tech, M.Sc, MCA or post-graduate degree programs. Individual scholar submissions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#C8B89A]/50">
              <span className="font-bold text-sm text-[#0A2A5E] block mb-1">Post-PG / PhD</span>
              <p className="leading-relaxed">
                Open to PhD candidates, doctoral scholars, and post-doctoral researchers. Individual scholar submissions demonstrating strong methodological rigor and reproducible results.
              </p>
            </div>
          </div>
        </div>

        {/* Paper Formatting Guidelines */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-display text-xl font-bold text-[#0A2A5E] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF6B00]" />
            <span>Formatting & Abstract Submission Standards</span>
          </h3>

          <ul className="space-y-3 text-xs text-[#5A5A7A]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
              <span>
                <strong>Standard IEEE Format:</strong> Extended abstracts must follow the standard IEEE 2-column conference template (A4 format, Times New Roman, 10pt text).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
              <span>
                <strong>Page Limits:</strong> Initial abstract filings should be strictly within <strong>2 printed pages</strong> (including figures, tables, and preliminary references).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
              <span>
                <strong>File Format:</strong> Only PDF (.pdf) files under <strong>5 MB</strong> will be accepted through the portal.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
              <span>
                <strong>Originality & Plagiarism Policy:</strong> Submissions must represent original research. Similarity index across Turnitin / IEEE CrossCheck must not exceed <strong>15%</strong> (excluding references).
              </span>
            </li>
          </ul>
        </div>

        {/* Conclave Presentation Format */}
        <div className="bg-[#FCF9F2] border-2 border-[#C8B89A] rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-display text-xl font-bold text-[#0A2A5E] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF6B00]" />
            <span>Conclave Presentation & Defense</span>
          </h3>

          <div className="space-y-3 text-xs text-[#5A5A7A]">
            <p className="leading-relaxed">
              Shortlisted candidates in each track will be invited for live oral presentations before track chairs and jury panels:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white border border-[#C8B89A]/50 rounded-lg text-center">
                <span className="font-bold text-sm text-[#0A2A5E] block">8 Minutes</span>
                <span className="text-[11px] text-gray-500">Presentation Deck (PPT/Slides)</span>
              </div>
              <div className="p-3 bg-white border border-[#C8B89A]/50 rounded-lg text-center">
                <span className="font-bold text-sm text-[#0A2A5E] block">4 Minutes</span>
                <span className="text-[11px] text-gray-500">Working Demo / Simulation</span>
              </div>
              <div className="p-3 bg-white border border-[#C8B89A]/50 rounded-lg text-center">
                <span className="font-bold text-sm text-[#0A2A5E] block">3 Minutes</span>
                <span className="text-[11px] text-gray-500">Jury Viva & Defense</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-5 sm:p-8 bg-[#0A2A5E] text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
        <div>
          <h3 className="font-display text-lg sm:text-2xl font-bold text-center sm:text-left">Ready to Showcase Your Research?</h3>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-md">
            Register your delegation today and take the first step towards Viksit Bharat 2047.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#E65A00] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg transition-all active:scale-95 min-h-[44px]"
          >
            <span>Register Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-[#0A2A5E] font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-md transition-all active:scale-95 min-h-[44px]"
          >
            <span>Submit Abstract</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesPage;
