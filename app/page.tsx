import React from 'react';
import CarbonWizard from '../components/CarbonWizard';

export const metadata = {
  title: 'UK PPN 06/21 Compliance Carbon Reduction Plan Wizard',
  description: 'Generate audit-ready Carbon Reduction Plans fully compliant with UK Government Procurement standards.',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Banner / Hero Block */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-8 md:p-14 text-white relative overflow-hidden shadow-2xl border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-black uppercase tracking-wider">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.833 3.746v5.275c0 5.176-3.712 9.4-7.833 10.662C5.879 19.575 2.166 15.35 2.166 10.175V4.9z" clipRule="evenodd" />
              </svg>
              PPN 06/21 Compliant
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              UK Carbon Reduction Plan (CRP) Wizard
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Bidding on UK public sector contracts valued over £5M? Produce a validated, Board-Ready Carbon Reduction Plan (CRP) fully compliant with UK Cabinet Office Procurement Policy Note PPN 06/21 in minutes.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <a
                href="#carbon-wizard"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-sm md:text-base uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5"
              >
                Start your free audit
                <svg className="w-5 h-5 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
                </svg>
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm uppercase tracking-wider px-6 py-4 rounded-xl transition-all"
              >
                View Pricing
              </a>
            </div>
          </div>
          {/* Decorative graphic representation */}
          <div className="relative w-full md:w-80 h-48 md:h-64 flex items-center justify-center bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 pointer-events-none" />
            <div className="text-center space-y-3 z-10">
              <div className="text-emerald-400 font-bold text-5xl tracking-tight">-50%</div>
              <p className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">Target Reduction Goal</p>
              <div className="h-1.5 w-32 bg-slate-700 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-emerald-500 w-1/2 rounded-full animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Aligned with UK Net Zero 2050</p>
            </div>
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-500 opacity-5 blur-2xl pointer-events-none" />
          </div>
        </div>

        {/* 'How It Works' Section */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Simple Workflow</h2>
            <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">How It Works</p>
            <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg shadow-inner">
                01
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Input Data</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Input your usage data (or use our UK Industry Benchmarks).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg shadow-inner">
                02
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Real-Time AI calculation</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                AI calculates your Scope 1, 2, and 3 footprint in real-time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg shadow-inner">
                03
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Download CRP PDF</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Download your official, board-ready PPN 06/21 compliant PDF.
              </p>
            </div>
          </div>
        </div>

        {/* 'Compliance Guarantee' Section */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900/10 pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Compliance Guarantee
              </div>
              <h3 className="text-xl md:text-3xl font-black tracking-tight leading-tight">
                Built to UK Cabinet Office PPN 06/21 Annex A standards.
              </h3>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
                Our engine utilizes the official 2026 DESNZ Greenhouse Gas Conversion Factors, ensuring full alignment with the GHG Protocol Corporate Standard and SECR requirements.
              </p>
            </div>
            
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-6 text-center lg:max-w-xs w-full space-y-4 shadow-inner">
              <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">Audit Readiness</span>
              <div className="text-3xl font-black text-white">100%</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Approved format for Central Government Procurement, NHS, and major municipal bidding.
              </p>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 w-64 h-64 rounded-full bg-emerald-600 opacity-5 blur-3xl pointer-events-none" />
        </div>

        {/* 'Pricing' Section */}
        <div id="pricing" className="space-y-8 scroll-mt-6">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-black text-emerald-700 uppercase tracking-widest font-mono">Simple & Clear</h2>
            <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Pricing Plans</p>
            <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Preview Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md space-y-6 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-black text-slate-900 uppercase tracking-wider">Free Preview</h3>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Trial
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">£0</span>
                  <span className="text-xs text-slate-500 font-semibold">Free Forever</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal font-semibold">
                  Test-drive our calculation engine and inspect your CRP report live.
                </p>
                
                <ul className="space-y-2.5 pt-4 text-xs">
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited emissions data input
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Carbon trajectory charting
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Full report preview with watermark
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <a
                  href="#carbon-wizard"
                  className="block text-center bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-colors"
                >
                  Start Free Audit
                </a>
              </div>
            </div>

            {/* Official Unlock Card */}
            <div className="bg-white rounded-3xl p-8 border-2 border-emerald-600 shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden hover:shadow-2xl transition-shadow">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black tracking-widest uppercase py-1 px-4 rounded-bl-xl">
                Best Value
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-black text-slate-900 uppercase tracking-wider">Official Unlock</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                    One-Off
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">£195</span>
                  <span className="text-xs text-slate-500 font-semibold">per plan</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal font-semibold">
                  Unlock access to download, sign, and print the official, unrestricted audit-ready PDF document.
                </p>
                
                <ul className="space-y-2.5 pt-4 text-xs">
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <strong>High-Contrast Board Sign-off Box</strong>
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Absolute removal of watermarks
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Download signed, board-ready, audit-compliant PDF document
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Save, edit & re-export calculations at any time
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <a
                  href="#carbon-wizard"
                  className="block text-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-emerald-500/20"
                >
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* High-Contrast CTA to Anchor directly to the Wizard */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 rounded-3xl p-8 md:p-10 text-center text-white space-y-4 shadow-xl border border-slate-700">
          <h3 className="text-lg md:text-2xl font-black uppercase tracking-wider">Ready to Generate Your Carbon Reduction Plan?</h3>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl mx-auto font-semibold">
            Input your data or use industry benchmarks to build, chart and view your compliant CRP document inside our live interactive engine.
          </p>
          <div className="pt-2">
            <a
              href="#carbon-wizard"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-md hover:scale-102"
            >
              Start your free audit
              <svg className="w-4 h-4 text-emerald-100 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Mounted Multi-Step Data Wizard */}
        <div className="pt-4">
          <CarbonWizard />
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 font-semibold space-y-1 pt-6 border-t border-slate-200">
          <p>UK Cabinet Office Procurement Policy Note PPN 06/21 Alignment</p>
          <p>© {new Date().getFullYear()} NetZero Micro-SaaS. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
