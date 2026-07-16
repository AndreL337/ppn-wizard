import React from 'react';
import { CarbonWizardInputs, EmissionsBreakdown, getEffectiveScope3Methodology } from '../services/emissionsCalculator';
import factorsHash from '../services/factors/hash.json';

interface OfficialCRPTemplateProps {
  inputs: CarbonWizardInputs;
  baselineEmissions: EmissionsBreakdown | null;
  reportingEmissions: EmissionsBreakdown;
  emissionsChangePercentage: number | null;
  isPreview?: boolean;
  useWasteBenchmark?: boolean;
  useCommutingBenchmark?: boolean;
}

export const OfficialCRPTemplate = React.forwardRef<HTMLDivElement, OfficialCRPTemplateProps>(
  ({ inputs, baselineEmissions, reportingEmissions, emissionsChangePercentage, isPreview, useWasteBenchmark = false, useCommutingBenchmark = false }, ref) => {
    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div
        ref={ref}
        id="official-crp-pdf-template"
        className="bg-white text-slate-950 p-12 max-w-[800px] mx-auto font-serif leading-relaxed space-y-8 relative"
        style={{ width: '800px' }} // Lock width for jspdf/html2canvas aspect ratio rendering
      >
        {/* Watermark for Preview Mode */}
        {isPreview && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" style={{ zIndex: 100 }}>
            {/* Page 1 Watermark */}
            <div className="absolute top-[25%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-600/10 text-5xl font-black tracking-wider uppercase border-8 border-red-600/10 px-8 py-4 whitespace-nowrap font-sans">
              PREVIEW MODE • WATERMARKED
            </div>
            {/* Page 2 Watermark */}
            <div className="absolute top-[55%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-600/10 text-5xl font-black tracking-wider uppercase border-8 border-red-600/10 px-8 py-4 whitespace-nowrap font-sans">
              PREVIEW MODE • WATERMARKED
            </div>
            {/* Page 3 Watermark */}
            <div className="absolute top-[85%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-600/10 text-5xl font-black tracking-wider uppercase border-8 border-red-600/10 px-8 py-4 whitespace-nowrap font-sans">
              PREVIEW MODE • WATERMARKED
            </div>
          </div>
        )}

        {/* Header Ribbon - Minimalist, No Rounded Corners */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
          <div className="space-y-1.5">
            <span className="text-[10px] font-sans font-bold tracking-widest text-slate-900 uppercase bg-slate-100 px-2 py-0.5 border border-slate-950">
              Cabinet Office PPN 06/21 Compliant
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">
              Carbon Reduction Plan (CRP)
            </h1>
            <p className="text-xs text-slate-700 font-medium font-serif italic">
              Prepared in accordance with UK Procurement Policy Note PPN 06/21
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Document Ref</p>
            <p className="text-xs font-bold text-slate-800 font-mono">CRP-v1.0-UK</p>
          </div>
        </div>

        {/* Section: Organization Details */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 font-sans">
            Organization Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Supplier Name</span>
              <span className="text-sm font-bold text-slate-900">{inputs.organizationName || '—'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Employee Headcount</span>
              <span className="text-sm font-bold text-slate-900">{inputs.employeeHeadcount || '—'} employees</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Reporting Period</span>
              <span className="text-sm font-bold text-slate-900">Year {inputs.reportingYear || '—'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Publication Date</span>
              <span className="text-sm font-bold text-slate-900">{todayStr}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Commitment */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 font-sans">
            1. Commitment to achieving Net Zero
          </h2>
          <p className="text-xs text-slate-900 leading-relaxed italic bg-slate-50 p-3 border border-slate-900">
            &ldquo;{inputs.commitmentStatement || `${inputs.organizationName || 'Our company'} is committed to achieving Net Zero greenhouse gas emissions by ${inputs.netZeroTargetYear || 2050} at the latest.`}&rdquo;
          </p>
        </div>

        {/* Section 2: Baseline Year */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 font-sans">
            2. Baseline Emissions Footprint
          </h2>
          <p className="text-[11px] text-slate-700 leading-normal">
            Baseline emissions are a record of the greenhouse gases that have been produced in the past, prior to the introduction of any carbon reduction strategies. They serve as the reference point against which emissions reductions are measured.
          </p>

          <div className="border border-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-900 font-bold font-sans">
                  <th className="p-2.5 border-r border-slate-900">Baseline Year: {inputs.baselineYear}</th>
                  <th className="p-2.5 text-right">Emissions (tCO₂e)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                <tr className="align-top">
                  <td className="p-2.5 font-bold text-slate-900 border-r border-slate-900">Scope 1 (Direct Emissions)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {baselineEmissions ? baselineEmissions.scope1.total.toFixed(2) : '—'}
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="p-2.5 font-bold text-slate-900 border-r border-slate-900">Scope 2 (Indirect Purchased Electricity)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {baselineEmissions ? baselineEmissions.scope2.total.toFixed(2) : '—'}
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="p-2.5 font-bold text-slate-900 border-r border-slate-900" colSpan={2}>
                    <div className="font-bold mb-1.5 font-sans uppercase text-[10px] tracking-wider text-slate-800">Scope 3 (Mandated Categories under PPN 06/21):</div>
                    <table className="w-full text-left text-[10px] border border-slate-900 border-collapse font-serif">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 font-bold font-sans text-slate-800 text-[9px]">
                          <th className="p-1.5 border-r border-slate-900 w-[180px]">Category</th>
                          <th className="p-1.5 border-r border-slate-900">Methodology Basis / Calculation Notes</th>
                          <th className="p-1.5 text-right w-[95px]">Emissions (tCO₂e)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 4: Upstream Dist</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat4')}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {baselineEmissions ? baselineEmissions.scope3.cat4UpstreamTrans.toFixed(2) : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 5: Operational Waste</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat5', useWasteBenchmark, useCommutingBenchmark)}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {baselineEmissions ? baselineEmissions.scope3.cat5OperationalWaste.toFixed(2) : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 6: Business Travel</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat6')}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {baselineEmissions ? baselineEmissions.scope3.cat6BusinessTravel.toFixed(2) : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 7: Employee Commuting</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat7', useWasteBenchmark, useCommutingBenchmark)}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {baselineEmissions ? baselineEmissions.scope3.cat7EmployeeCommuting.toFixed(2) : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 9: Downstream Dist</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat9')}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {baselineEmissions ? baselineEmissions.scope3.cat9DownstreamTrans.toFixed(2) : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold text-slate-950">
                  <td className="p-2.5 border-r border-slate-900 font-bold font-sans uppercase text-[10px] tracking-wider">Total Baseline Emissions</td>
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
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 font-sans">
            3. Current Reporting Year Emissions Footprint
          </h2>

          <div className="border border-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-900 font-bold font-sans">
                  <th className="p-2.5 border-r border-slate-900">Reporting Year: {inputs.reportingYear}</th>
                  <th className="p-2.5 text-right">Emissions (tCO₂e)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                <tr className="align-top">
                  <td className="p-2.5 font-bold text-slate-900 border-r border-slate-900">Scope 1 (Direct Emissions)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {reportingEmissions.scope1.total.toFixed(2)}
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="p-2.5 font-bold text-slate-900 border-r border-slate-900">Scope 2 (Indirect Purchased Electricity)</td>
                  <td className="p-2.5 text-right font-bold text-slate-950">
                    {reportingEmissions.scope2.total.toFixed(2)}
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="p-2.5 font-bold text-slate-900 border-r border-slate-900" colSpan={2}>
                    <div className="font-bold mb-1.5 font-sans uppercase text-[10px] tracking-wider text-slate-800">Scope 3 (Mandated Categories under PPN 06/21):</div>
                    <table className="w-full text-left text-[10px] border border-slate-900 border-collapse font-serif">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 font-bold font-sans text-slate-800 text-[9px]">
                          <th className="p-1.5 border-r border-slate-900 w-[180px]">Category</th>
                          <th className="p-1.5 border-r border-slate-900">Methodology Basis / Calculation Notes</th>
                          <th className="p-1.5 text-right w-[95px]">Emissions (tCO₂e)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 4: Upstream Dist</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat4')}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {reportingEmissions.scope3.cat4UpstreamTrans.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 5: Operational Waste</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat5', useWasteBenchmark, useCommutingBenchmark)}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {reportingEmissions.scope3.cat5OperationalWaste.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 6: Business Travel</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat6')}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {reportingEmissions.scope3.cat6BusinessTravel.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 7: Employee Commuting</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat7', useWasteBenchmark, useCommutingBenchmark)}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {reportingEmissions.scope3.cat7EmployeeCommuting.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border-r border-slate-900 font-sans font-semibold text-slate-900">Category 9: Downstream Dist</td>
                          <td className="p-1.5 border-r border-slate-900 italic text-[9px] leading-tight text-slate-700">
                            {getEffectiveScope3Methodology(inputs, 'cat9')}
                          </td>
                          <td className="p-1.5 text-right font-bold text-slate-950">
                            {reportingEmissions.scope3.cat9DownstreamTrans.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold text-slate-950">
                  <td className="p-2.5 border-r border-slate-900 font-bold font-sans uppercase text-[10px] tracking-wider">Total Reporting Emissions</td>
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
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-2 font-sans">
              4. Emissions Reduction Targets
            </h2>
            <p className="text-xs text-slate-900 leading-relaxed">
              In order to continue our progress towards achieving Net Zero, we have adopted carbon reduction targets.
              Our baseline emissions are projected to decrease over the next 5 years to achieve a significant reduction of 
              at least {emissionsChangePercentage ? Math.abs(Number(emissionsChangePercentage)).toFixed(1) : '50'}% by {inputs.netZeroTargetYear || 2050}.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-2 font-sans">
              5. Carbon Reduction Projects & Initiatives
            </h2>
            <div className="bg-slate-50 p-3 border border-slate-900 text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
              {inputs.plannedReductions ||
                'To support carbon reduction targets, several initiatives have been deployed. We are aiming for progressive transition across our operations including green energy procurement, low emission transport schemes, and waste reduction guidelines.'}
            </div>
          </div>
        </div>

        {/* Section 6: Declaration & Sign-off - Forces Page Break */}
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="space-y-6 pt-8">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 font-sans">
            6. Declaration and Sign-off
          </h2>
          <p className="text-[10px] text-slate-600 leading-normal">
            This Carbon Reduction Plan has been completed in accordance with PPN 06/21 and associated guidance and reporting methodology for Carbon Reduction Plans. Emissions have been reported and recorded in accordance with the published reporting standard for Carbon Reduction Plans and the GHG Reporting Protocol corporate standard.
          </p>

          {/* High-Contrast Board-Ready Sign-off Box - Flat, 1px Border, No Rounded corners, No Shadows */}
          <div className="border border-slate-900 bg-slate-50 p-6 space-y-6">
            <div className="border-b border-slate-900 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 font-sans">
                Official Board-Ready Sign-off
              </h3>
            </div>

            <p className="text-xs text-slate-900 font-bold leading-relaxed">
              This Carbon Reduction Plan has been reviewed and signed off by the board of directors (or equivalent management body).
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
              {/* Signature Field */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block font-sans">Signed on behalf of the Supplier by:</span>
                  <div className="border-b border-dashed border-slate-900 h-10 flex items-end pb-1">
                    <span className="italic text-slate-300 font-serif text-xs select-none">Authorized Director / Officer Signature</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="border-b border-slate-900 h-6 flex items-end pb-1">
                      <span className="font-bold text-slate-900">{inputs.organizationName || '—'} Board Representative</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-sans">Printed Name</p>
                  </div>
                  
                  <div>
                    <div className="border-b border-slate-900 h-6 flex items-end pb-1">
                      <span className="font-semibold text-slate-800">Director / Senior Executive Officer</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-sans">Title / Position</p>
                  </div>
                </div>
              </div>

              {/* Date & Witness Field */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block font-sans">Date of Sign-off:</span>
                  <div className="border-b border-slate-900 h-10 flex items-end pb-1">
                    <span className="font-bold text-slate-950 text-sm font-sans">{todayStr}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-sans">Effective Date</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block font-sans">Attested / Witnessed By:</span>
                  <div className="border-b border-dashed border-slate-900 h-10 flex items-end pb-1">
                    <span className="italic text-slate-300 font-serif text-xs select-none">Witness Signature / Stamp</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-sans">Corporate Witness</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Auditable Factor-Set Version Hash */}
        <div className="border-t border-slate-900 pt-4 flex justify-between text-[9px] text-slate-500 font-serif">
          <span>PPN Wizard • Official PPN 06/21 Carbon Reduction Record</span>
          <span className="font-mono">Factors: 2026-v1.0 (DESNZ Headline Dataset) [SHA256: {factorsHash.hash}]</span>
          <span>Official Record</span>
        </div>
      </div>
    );
  }
);

OfficialCRPTemplate.displayName = 'OfficialCRPTemplate';
