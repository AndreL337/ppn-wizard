import React from 'react';
import CarbonWizard from '../components/CarbonWizard';

export const metadata = {
  title: 'UK PPN 06/21 Compliance Carbon Reduction Plan Wizard',
  description: 'Generate audit-ready Carbon Reduction Plans fully compliant with UK Government Procurement standards.',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-8 md:p-12 mb-8 text-white relative overflow-hidden shadow-lg border border-slate-700">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.833 3.746v5.275c0 5.176-3.712 9.4-7.833 10.662C5.879 19.575 2.166 15.35 2.166 10.175V4.9z" clipRule="evenodd" />
              </svg>
              PPN 06/21 Compliant
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              UK Carbon Reduction Plan (CRP) Wizard
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              For bidding on UK public contracts valued at &gt;£5m per annum, companies must produce a validated Carbon Reduction Plan. Use this tool to enter your greenhouse gas inventory and generate a compliant statement in seconds.
            </p>
          </div>
          {/* Decorative background shape */}
          <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 w-96 h-96 rounded-full bg-emerald-500 opacity-10 blur-3xl pointer-events-none" />
        </div>

        {/* Mounted Multi-Step Data Wizard */}
        <CarbonWizard />

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-400 font-semibold space-y-1">
          <p>UK Cabinet Office Procurement Policy Note PPN 06/21 Alignment</p>
          <p>© {new Date().getFullYear()} NetZero Micro-SaaS. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
