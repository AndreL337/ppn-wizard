import React from 'react';
import { CarbonWizardInputs, EmissionsBreakdown } from '../services/emissionsCalculator';

interface OfficialCRPTemplateProps {
  inputs: CarbonWizardInputs;
  baselineEmissions: EmissionsBreakdown | null;
  reportingEmissions: EmissionsBreakdown;
  emissionsChangePercentage: number | null;
  isPreview?: boolean;
}

export const OfficialCRPTemplate = React.forwardRef<HTMLDivElement, OfficialCRPTemplateProps>(
  ({ inputs, baselineEmissions, reportingEmissions, emissionsChangePercentage, isPreview }, ref) => {
    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div
        ref={ref}
        id="official-crp-pdf-template"
        className="bg-white text-slate-950 p-12 max-w-[800px] mx-auto font-sans leading-relaxed space-y-8 relative"
        style={{ width: '800px' }} // Lock width for jspdf/html2canvas aspect ratio rendering
      >
        {/* Watermark for Preview Mode */}
        {isPreview && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" style={{ zIndex: 100 }}>
            {/* Page 1 Watermark */}
            <div className="absolute top-[25%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-600/10 text-5xl font-black tracking-wider uppercase border-8 border-red-600/10 px-8 py-4 rounded-2xl whitespace-nowrap">
              PREVIEW MODE • WATERMARKED
            </div>
            {/* Page 2 Watermark */}
            <div className="absolute top-[55%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-600/10 text-5xl font-black tracking-wider uppercase border-8 border-red-600/10 px-8 py-4 rounded-2xl whitespace-nowrap">
              PREVIEW MODE • WATERMARKED
            </div>
            {/* Page 3 Watermark */}
            <div className="absolute top-[85%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-600/10 text-5xl font-black tracking-wider uppercase border-8 border-red-600/10 px-8 py-4 rounded-2xl whitespace-nowrap">
              PREVIEW MODE • WATERMARKED
            </div>
          </div>
        )}
        {/* Header Ribbon */}
        <div className="border-b-4 border-emerald-800 pb-4 flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-widest text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Cabinet Office PPN 06/21 Compliant
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Carbon Reduction Plan (CRP)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Prepared in accordance with Procurement Policy Note PPN 06/21
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Version</p>
            <p className="text-xs font-extrabold text-slate-800">CRP-v1.0-UK</p>
          </div>
        </div>

        {/* Section: Organization Details */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1">
            Organization Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-bold uppercase block">Supplier Name</span>
              <span className="text-sm font-bold text-slate-900">{inputs.organizationName || '—'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 font-bold uppercase block">Employee Headcount</span>
              <span className="text-sm font-bold text-slate-900">{inputs.employeeHeadcount || '—'} employees</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 font-bold uppercase block">Reporting Period</span>
              <span className="text-sm font-bold text-slate-900">Year {inputs.reportingYear || '—'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 font-bold uppercase block">Publication Date</span>
              <span className="text-sm font-bold text-slate-900">{todayStr}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Commitment */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1">
            1. Commitment to achieving Net Zero
          </h2>
          <p className="text-xs text-slate-800 leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-slate-200">
            &ldquo;{inputs.commitmentStatement || `${inputs.organizationName || 'Our company'} is committed to achieving Net Zero greenhouse gas emissions by ${inputs.netZeroTargetYear || 2050} at the latest.`}&rdquo;
          </p>
        </div>

        {/* Section 2: Baseline Year */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1">
            2. Baseline Emissions Footprint
          </h2>
          <p className="text-[11px] text-slate-500 leading-normal">
            Baseline emissions are a record of the greenhouse gases that have been produced in the past, prior to the introduction of any carbon reduction strategies. They serve as the reference point against which emissions reductions are measured.
          </p>

          <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-800 border-b border-slate-200 font-bold">
                  <th className="p-2.5">Baseline Year: {inputs.baselineYear}</th>
                  <th className="p-2.5 text-right">Emissions (tCO₂e)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700">Scope 1 (Direct Emissions)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {baselineEmissions ? baselineEmissions.scope1.total.toFixed(2) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700">Scope 2 (Indirect Purchased Electricity)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {baselineEmissions ? baselineEmissions.scope2.total.toFixed(2) : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700" colSpan={2}>
                    <div>Scope 3 (Mandated Categories under PPN 06/21):</div>
                    <div className="grid grid-cols-1 gap-1 pl-4 mt-1.5 text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>• Category 4: Upstream transportation and distribution</span>
                        <span className="font-bold">{baselineEmissions ? baselineEmissions.scope3.cat4UpstreamTrans.toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 5: Waste generated in operations</span>
                        <span className="font-bold">{baselineEmissions ? baselineEmissions.scope3.cat5OperationalWaste.toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 6: Business travel</span>
                        <span className="font-bold">{baselineEmissions ? baselineEmissions.scope3.cat6BusinessTravel.toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 7: Employee commuting</span>
                        <span className="font-bold">{baselineEmissions ? baselineEmissions.scope3.cat7EmployeeCommuting.toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 9: Downstream transportation and distribution</span>
                        <span className="font-bold">{baselineEmissions ? baselineEmissions.scope3.cat9DownstreamTrans.toFixed(2) : '—'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-950">
                  <td className="p-2.5">Total Baseline Emissions</td>
                  <td className="p-2.5 text-right text-sm">
                    {baselineEmissions ? `${baselineEmissions.grandTotal.toFixed(2)} tCO₂e` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Current Reporting Year */}
        <div className="space-y-3">
          <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1">
            3. Current Reporting Year Emissions Footprint
          </h2>

          <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-800 border-b border-slate-200 font-bold">
                  <th className="p-2.5">Reporting Year: {inputs.reportingYear}</th>
                  <th className="p-2.5 text-right">Emissions (tCO₂e)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700">Scope 1 (Direct Emissions)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {reportingEmissions.scope1.total.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700">Scope 2 (Indirect Purchased Electricity)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {reportingEmissions.scope2.total.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-700" colSpan={2}>
                    <div>Scope 3 (Mandated Categories under PPN 06/21):</div>
                    <div className="grid grid-cols-1 gap-1 pl-4 mt-1.5 text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>• Category 4: Upstream transportation and distribution</span>
                        <span className="font-bold">{reportingEmissions.scope3.cat4UpstreamTrans.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 5: Waste generated in operations</span>
                        <span className="font-bold">{reportingEmissions.scope3.cat5OperationalWaste.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 6: Business travel</span>
                        <span className="font-bold">{reportingEmissions.scope3.cat6BusinessTravel.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 7: Employee commuting</span>
                        <span className="font-bold">{reportingEmissions.scope3.cat7EmployeeCommuting.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Category 9: Downstream transportation and distribution</span>
                        <span className="font-bold">{reportingEmissions.scope3.cat9DownstreamTrans.toFixed(2)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-950">
                  <td className="p-2.5">Total Reporting Emissions</td>
                  <td className="p-2.5 text-right text-sm">
                    {reportingEmissions.grandTotal.toFixed(2)} tCO₂e
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4 & 5: Targets & Projects */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1 mb-2">
              4. Emissions Reduction Targets
            </h2>
            <p className="text-xs text-slate-800 leading-relaxed">
              In order to continue our progress towards achieving Net Zero, we have adopted carbon reduction targets.
              Our baseline emissions are projected to decrease over the next 5 years to achieve a significant reduction of 
              at least {emissionsChangePercentage ? Math.abs(Number(emissionsChangePercentage)).toFixed(1) : '50'}% by {inputs.netZeroTargetYear || 2050}.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1 mb-2">
              5. Carbon Reduction Projects & Initiatives
            </h2>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {inputs.plannedReductions ||
                'To support carbon reduction targets, several initiatives have been deployed. We are aiming for progressive transition across our operations including green energy procurement, low emission transport schemes, and waste reduction guidelines.'}
            </div>
          </div>
        </div>

        {/* Section 6: Declaration & Sign-off */}
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="space-y-6 pt-8">
          <h2 className="text-sm font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-100 pb-1">
            6. Declaration and Sign-off
          </h2>
          <p className="text-[10px] text-slate-500 leading-normal">
            This Carbon Reduction Plan has been completed in accordance with PPN 06/21 and associated guidance and reporting methodology for Carbon Reduction Plans. Emissions have been reported and recorded in accordance with the published reporting standard for Carbon Reduction Plans and the GHG Reporting Protocol corporate standard.
          </p>

          {/* High-Contrast Board-Ready Sign-off Box */}
          <div className="border-2 border-emerald-800 rounded-xl bg-slate-50/50 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-3">
              <div className="bg-emerald-800 text-white rounded-full p-1.5 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                Official Board-Ready Authorization
              </h3>
            </div>

            <p className="text-xs text-slate-900 font-extrabold leading-relaxed">
              This Carbon Reduction Plan has been reviewed and signed off by the board of directors (or equivalent management body).
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
              {/* Signature Field */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Signed on behalf of the Supplier:</span>
                  <div className="border-b border-dashed border-slate-400 h-10 flex items-end pb-1">
                    <span className="italic text-slate-300 font-serif text-xs select-none">Authorized Board Signature</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="border-b border-slate-300 h-6 flex items-end pb-1">
                      <span className="font-bold text-slate-900">{inputs.organizationName || '—'} Board Representative</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Printed Name</p>
                  </div>
                  
                  <div>
                    <div className="border-b border-slate-300 h-6 flex items-end pb-1">
                      <span className="font-semibold text-slate-700">Director / Executive Officer</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Title / Position</p>
                  </div>
                </div>
              </div>

              {/* Date & Witness Field */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Date of Sign-off:</span>
                  <div className="border-b border-slate-300 h-10 flex items-end pb-1">
                    <span className="font-extrabold text-slate-950 text-sm">{todayStr}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Effective Date</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Attested / Witnessed By:</span>
                  <div className="border-b border-dashed border-slate-400 h-10 flex items-end pb-1">
                    <span className="italic text-slate-300 font-serif text-xs select-none">Witness Signature / Stamp</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Corporate Witness</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

OfficialCRPTemplate.displayName = 'OfficialCRPTemplate';
