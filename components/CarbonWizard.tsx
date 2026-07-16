'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  calculateEmissions,
  getInitialWizardInputs,
  generateSampleBaseline,
  EmissionsBreakdown,
  CarbonWizardInputs,
  EMISSION_FACTORS,
  getEffectiveScope3Methodology,
} from '../services/emissionsCalculator';
import { OfficialCRPTemplate } from './OfficialCRPTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';
import SupabaseAuth from './SupabaseAuth';
import { User } from '@supabase/supabase-js';

export default function CarbonWizard() {
  // Wizard states
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [inputs, setInputs] = useState<CarbonWizardInputs>(getInitialWizardInputs());
  const [baselineInputs, setBaselineInputs] = useState<CarbonWizardInputs | null>(null);

  // Benchmark toggle states
  const [useGasBenchmark, setUseGasBenchmark] = useState<boolean>(false);
  const [useElectricityBenchmark, setUseElectricityBenchmark] = useState<boolean>(false);
  const [useWasteBenchmark, setUseWasteBenchmark] = useState<boolean>(false);
  const [useCommutingBenchmark, setUseCommutingBenchmark] = useState<boolean>(false);

  // Supabase save & resume states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Stripe & Preview/Methodology Modal states
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  // Handle Stripe Unlock Payment
  const handleUnlockPDF = async () => {
    setIsUnlocking(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initiate unlock process. Please try again.');
      }
    } catch (err) {
      console.error('Error initiating checkout:', err);
      alert('Failed to connect to checkout server.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Check URL query parameters and local storage for unlock state
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUnlock = localStorage.getItem('carbon_wizard_unlocked_plan');
      if (savedUnlock === 'true') {
        setIsUnlocked(true);
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        setIsUnlocked(true);
        localStorage.setItem('carbon_wizard_unlocked_plan', 'true');
        // Clean URL params to avoid re-triggering success toasts
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const handleSaveProgress = async () => {
    if (!currentUser) {
      setSaveStatus('error');
      setSaveMessage('Please sign in using your email in the "Save & Resume" card to save progress.');
      return;
    }

    setSaveStatus('saving');
    setSaveMessage('');

    try {
      // 1. Update Profile
      await supabase.from('profiles').upsert({
        id: currentUser.id,
        company_name: inputs.organizationName,
        employee_headcount: inputs.employeeHeadcount,
        updated_at: new Date().toISOString()
      });

      // 2. Query for existing audit report for this user
      const { data: existingReports } = await supabase
        .from('audit_reports')
        .select('id')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      const reportPayload = {
        user_id: currentUser.id,
        organization_name: inputs.organizationName,
        baseline_year: inputs.baselineYear,
        reporting_year: inputs.reportingYear,
        net_zero_target_year: inputs.netZeroTargetYear,
        commitment_statement: inputs.commitmentStatement,
        employee_headcount: inputs.employeeHeadcount,
        planned_reductions: inputs.plannedReductions,
        scope1: inputs.scope1,
        scope2: inputs.scope2,
        scope3_cat4: inputs.scope3Cat4,
        scope3_cat5: inputs.scope3Cat5,
        scope3_cat6: inputs.scope3Cat6,
        scope3_cat7: inputs.scope3Cat7,
        scope3_cat9: inputs.scope3Cat9,
        raw_inputs: {
          inputs,
          baselineInputs,
          useGasBenchmark,
          useElectricityBenchmark,
          useWasteBenchmark,
          useCommutingBenchmark,
        },
        updated_at: new Date().toISOString()
      };

      if (existingReports && existingReports.length > 0) {
        const { error } = await supabase
          .from('audit_reports')
          .update(reportPayload)
          .eq('id', existingReports[0].id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('audit_reports')
          .insert(reportPayload);
        
        if (error) throw error;
      }

      setSaveStatus('saved');
      setSaveMessage('Progress saved successfully to your cloud profile!');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 4000);
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setSaveStatus('error');
      setSaveMessage(err.message || 'Failed to save progress.');
    }
  };

  // Listen or respond when currentUser is available
  React.useEffect(() => {
    if (currentUser) {
      const loadLatestDraft = async () => {
        try {
          const { data, error } = await supabase
            .from('audit_reports')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (error) throw error;

          if (data && data.length > 0) {
            const report = data[0];
            const raw = report.raw_inputs;
            if (raw) {
              if (raw.inputs) setInputs(raw.inputs);
              if (raw.baselineInputs) setBaselineInputs(raw.baselineInputs);
              if (raw.useGasBenchmark !== undefined) setUseGasBenchmark(raw.useGasBenchmark);
              if (raw.useElectricityBenchmark !== undefined) setUseElectricityBenchmark(raw.useElectricityBenchmark);
              if (raw.useWasteBenchmark !== undefined) setUseWasteBenchmark(raw.useWasteBenchmark);
              if (raw.useCommutingBenchmark !== undefined) setUseCommutingBenchmark(raw.useCommutingBenchmark);
            }
          }
        } catch (err) {
          console.error('Error loading latest draft:', err);
        }
      };
      loadLatestDraft();
    }
  }, [currentUser]);

  const saveAuditRecord = async (reportId?: string) => {
    if (!currentUser) return null;
    
    try {
      let finalReportId = reportId;
      if (!finalReportId) {
        const { data: existingReports } = await supabase
          .from('audit_reports')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (existingReports && existingReports.length > 0) {
          finalReportId = existingReports[0].id;
        }
      }

      if (!finalReportId) {
        // Automatically save current draft first to ensure the audit report exists
        await handleSaveProgress();
        const { data: newReports } = await supabase
          .from('audit_reports')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (newReports && newReports.length > 0) {
          finalReportId = newReports[0].id;
        }
      }

      if (!finalReportId) {
        console.warn('Could not determine report ID for snapshot.');
        return null;
      }

      // Save factors snapshot to carbon_audits table
      const { data: auditData, error: auditError } = await supabase
        .from('carbon_audits')
        .insert({
          user_id: currentUser.id,
          report_id: finalReportId,
          factor_set_version: '2026-v1.0',
          audited_factors_snapshot: EMISSION_FACTORS,
        })
        .select()
        .single();

      if (auditError) throw auditError;
      if (!auditData) return null;

      const auditId = auditData.id;

      // Map Scope 3 calculation notes & methodology basis to scope3_records
      const scope3Records = [
        {
          audit_id: auditId,
          category: 'Category 4: Upstream Transportation & Distribution',
          emissions_tco2e: reportingEmissions.scope3.cat4UpstreamTrans,
          methodology_basis: getEffectiveScope3Methodology(inputs, 'cat4'),
          calculation_notes: JSON.stringify(inputs.scope3Cat4),
        },
        {
          audit_id: auditId,
          category: 'Category 5: Operational Waste',
          emissions_tco2e: reportingEmissions.scope3.cat5OperationalWaste,
          methodology_basis: getEffectiveScope3Methodology(inputs, 'cat5', useWasteBenchmark, useCommutingBenchmark),
          calculation_notes: JSON.stringify(inputs.scope3Cat5),
        },
        {
          audit_id: auditId,
          category: 'Category 6: Business Travel',
          emissions_tco2e: reportingEmissions.scope3.cat6BusinessTravel,
          methodology_basis: getEffectiveScope3Methodology(inputs, 'cat6'),
          calculation_notes: JSON.stringify(inputs.scope3Cat6),
        },
        {
          audit_id: auditId,
          category: 'Category 7: Employee Commuting',
          emissions_tco2e: reportingEmissions.scope3.cat7EmployeeCommuting,
          methodology_basis: getEffectiveScope3Methodology(inputs, 'cat7', useWasteBenchmark, useCommutingBenchmark),
          calculation_notes: JSON.stringify(inputs.scope3Cat7),
        },
        {
          audit_id: auditId,
          category: 'Category 9: Downstream Transportation & Distribution',
          emissions_tco2e: reportingEmissions.scope3.cat9DownstreamTrans,
          methodology_basis: getEffectiveScope3Methodology(inputs, 'cat9'),
          calculation_notes: JSON.stringify(inputs.scope3Cat9),
        },
      ];

      const { error: scope3Error } = await supabase
        .from('scope3_records')
        .insert(scope3Records);

      if (scope3Error) throw scope3Error;
      console.log('Successfully saved forensic audit snapshot and scope 3 records.');
      return auditId;
    } catch (error) {
      console.error('Error saving forensic audit snapshot:', error);
      return null;
    }
  };

  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleDownloadPDF = async () => {
    const element = pdfTemplateRef.current;
    if (!element) return;
    setIsDownloading(true);

    try {
      // Save forensic audit records on report finalization/download
      if (currentUser) {
        await saveAuditRecord();
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const imgWidth = pdfWidth;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Add extra pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const orgSlug = (inputs.organizationName || 'supplier').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      pdf.save(`Carbon-Reduction-Plan-${orgSlug}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Keep auto-populated benchmark values synchronized when employee headcount changes
  React.useEffect(() => {
    if (useGasBenchmark) {
      setInputs((prev) => ({
        ...prev,
        scope1: {
          ...prev.scope1,
          naturalGasKwh: prev.employeeHeadcount * 1200,
        },
      }));
    }
  }, [inputs.employeeHeadcount, useGasBenchmark]);

  React.useEffect(() => {
    if (useElectricityBenchmark) {
      setInputs((prev) => ({
        ...prev,
        scope2: {
          ...prev.scope2,
          gridElectricityKwh: prev.employeeHeadcount * 950,
        },
      }));
    }
  }, [inputs.employeeHeadcount, useElectricityBenchmark]);

  React.useEffect(() => {
    if (useWasteBenchmark) {
      setInputs((prev) => ({
        ...prev,
        scope3Cat5: {
          ...prev.scope3Cat5,
          landfillTonnes: Number((prev.employeeHeadcount * 0.1).toFixed(2)),
          recycledTonnes: Number((prev.employeeHeadcount * 0.1).toFixed(2)),
        },
      }));
    }
  }, [inputs.employeeHeadcount, useWasteBenchmark]);

  React.useEffect(() => {
    if (useCommutingBenchmark) {
      setInputs((prev) => ({
        ...prev,
        scope3Cat7: {
          ...prev.scope3Cat7,
          commuteCarKm: prev.employeeHeadcount * 1007,
        },
      }));
    }
  }, [inputs.employeeHeadcount, useCommutingBenchmark]);

  // Sub-sections for Scope 3 in Step 4
  const [activeScope3Tab, setActiveScope3Tab] = useState<'cat4' | 'cat5' | 'cat6' | 'cat7' | 'cat9'>('cat4');

  // Benchmark Toggle Handlers
  const handleToggleGasBenchmark = (checked: boolean) => {
    setUseGasBenchmark(checked);
    if (checked) {
      setInputs((prev) => ({
        ...prev,
        scope1: {
          ...prev.scope1,
          naturalGasKwh: prev.employeeHeadcount * 1200,
        },
      }));
    } else {
      setInputs((prev) => ({
        ...prev,
        scope1: {
          ...prev.scope1,
          naturalGasKwh: 0,
        },
      }));
    }
  };

  const handleToggleElectricityBenchmark = (checked: boolean) => {
    setUseElectricityBenchmark(checked);
    if (checked) {
      setInputs((prev) => ({
        ...prev,
        scope2: {
          ...prev.scope2,
          gridElectricityKwh: prev.employeeHeadcount * 950,
        },
      }));
    } else {
      setInputs((prev) => ({
        ...prev,
        scope2: {
          ...prev.scope2,
          gridElectricityKwh: 0,
        },
      }));
    }
  };

  const handleToggleWasteBenchmark = (checked: boolean) => {
    setUseWasteBenchmark(checked);
    if (checked) {
      setInputs((prev) => ({
        ...prev,
        scope3Cat5: {
          ...prev.scope3Cat5,
          landfillTonnes: Number((prev.employeeHeadcount * 0.1).toFixed(2)),
          recycledTonnes: Number((prev.employeeHeadcount * 0.1).toFixed(2)),
          combustedTonnes: 0,
          compostedTonnes: 0,
        },
      }));
    } else {
      setInputs((prev) => ({
        ...prev,
        scope3Cat5: {
          ...prev.scope3Cat5,
          landfillTonnes: 0,
          recycledTonnes: 0,
          combustedTonnes: 0,
          compostedTonnes: 0,
        },
      }));
    }
  };

  const handleToggleCommutingBenchmark = (checked: boolean) => {
    setUseCommutingBenchmark(checked);
    if (checked) {
      setInputs((prev) => ({
        ...prev,
        scope3Cat7: {
          ...prev.scope3Cat7,
          commuteCarKm: prev.employeeHeadcount * 1007,
          commuteCarUnit: 'miles',
          commuteRailKm: 0,
          commuteBusKm: 0,
          wfhDays: 0,
        },
      }));
    } else {
      setInputs((prev) => ({
        ...prev,
        scope3Cat7: {
          ...prev.scope3Cat7,
          commuteCarKm: 0,
          commuteCarUnit: 'miles',
          commuteRailKm: 0,
          commuteBusKm: 0,
          wfhDays: 0,
        },
      }));
    }
  };

  // Input helpers
  const handleInputChange = (
    section: keyof CarbonWizardInputs | null,
    field: string,
    value: string | number
  ) => {
    if (section === null) {
      setInputs((prev) => ({ ...prev, [field]: value }));
    } else {
      setInputs((prev) => {
        const sec = prev[section] as any;
        return {
          ...prev,
          [section]: {
            ...sec,
            [field]: value,
          },
        };
      });
    }
  };

  const handleBaselineInputChange = (
    section: keyof CarbonWizardInputs,
    field: string,
    value: string | number
  ) => {
    if (!baselineInputs) return;
    setBaselineInputs((prev) => {
      if (!prev) return null;
      const sec = prev[section] as any;
      return {
        ...prev,
        [section]: {
          ...sec,
          [field]: value,
        },
      };
    });
  };

  // Generate a realistic baseline automatically
  const handleAutoGenerateBaseline = () => {
    const generated = generateSampleBaseline(inputs);
    setBaselineInputs(generated);
  };

  // Manual baseline creation
  const handleEnableManualBaseline = () => {
    const initial = getInitialWizardInputs();
    initial.organizationName = inputs.organizationName;
    initial.reportingYear = inputs.baselineYear;
    setBaselineInputs(initial);
  };

  // Calculations
  const reportingEmissions: EmissionsBreakdown = useMemo(() => {
    return calculateEmissions(inputs);
  }, [inputs]);

  const baselineEmissions: EmissionsBreakdown | null = useMemo(() => {
    if (!baselineInputs) return null;
    return calculateEmissions(baselineInputs);
  }, [baselineInputs]);

  // Total reductions helper
  const emissionsChangePercentage = useMemo(() => {
    if (!baselineEmissions) return null;
    const change = reportingEmissions.grandTotal - baselineEmissions.grandTotal;
    const percent = (change / baselineEmissions.grandTotal) * 100;
    return percent;
  }, [reportingEmissions, baselineEmissions]);

  const totalSteps = 6;
  const stepPercentage = Math.round((currentStep / totalSteps) * 100);

  // Standard UK Government commitments
  const setStandardCommitment = () => {
    const company = inputs.organizationName || '[Your Company Name]';
    handleInputChange(
      null,
      'commitmentStatement',
      `${company} is committed to achieving Net Zero greenhouse gas emissions by ${inputs.netZeroTargetYear} at the latest.`
    );
  };

  return (
    <div id="carbon-wizard" className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-800 font-sans scroll-mt-6">
      {/* SaaS Branding Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#E0F2F1] text-[#006D5B] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              UK PPN 06/21
            </span>
            <span className="text-slate-500 text-sm font-medium">Compliance Wizard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            NetZero PPN 06/21 Compliance Engine
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Generate audit-ready Carbon Reduction Plans (CRP) fully compliant with UK Government Procurement standards.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Period Emissions</p>
            <p className="text-xl font-bold text-[#006D5B]">{reportingEmissions.grandTotal} tCO₂e</p>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Baseline Year</p>
            <p className="text-xl font-bold text-slate-700">
              {baselineEmissions ? `${baselineEmissions.grandTotal} tCO₂e` : 'Not Set'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Stepper bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
          <span>Step {currentStep} of {totalSteps}: {getStepName(currentStep)}</span>
          <span className="text-[#006D5B]">{stepPercentage}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#006D5B] h-full transition-all duration-300 ease-in-out"
            style={{ width: `${stepPercentage}%` }}
          />
        </div>
        <div className="hidden md:flex justify-between text-xs font-semibold text-slate-400 mt-1">
          <span className={currentStep >= 1 ? 'text-[#006D5B] font-bold' : ''}>1. Strategy</span>
          <span className={currentStep >= 2 ? 'text-[#006D5B] font-bold' : ''}>2. Scope 1 (Direct)</span>
          <span className={currentStep >= 3 ? 'text-[#006D5B] font-bold' : ''}>3. Scope 2 (Indirect)</span>
          <span className={currentStep >= 4 ? 'text-[#006D5B] font-bold' : ''}>4. Scope 3 (PPN 06/21)</span>
          <span className={currentStep >= 5 ? 'text-[#006D5B] font-bold' : ''}>5. Reduction Initiatives</span>
          <span className={currentStep >= 6 ? 'text-[#006D5B] font-bold' : ''}>6. Compliance Report</span>
        </div>
      </div>

      {/* Main Form Body / Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Panel */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-md p-6 md:p-8 space-y-6 min-h-[500px] flex flex-col justify-between">
          <div>
            {/* STEP 1: ORGANIZATION AND GOALS */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#006D5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Organization Strategy & Targets
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Set up your organization parameters, reporting years, and formal greenhouse gas commitments.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization Name</label>
                    <input
                      type="text"
                      className="w-full border-b-2 border-slate-200 focus:border-[#006D5B] bg-transparent pb-1.5 text-sm outline-none focus:ring-0 transition-colors"
                      placeholder="e.g. Acme UK Procurement Ltd"
                      value={inputs.organizationName}
                      onChange={(e) => handleInputChange(null, 'organizationName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Zero Target Year</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-slate-200 focus:border-[#006D5B] bg-transparent pb-1.5 text-sm outline-none focus:ring-0 transition-colors"
                      value={inputs.netZeroTargetYear}
                      onChange={(e) => handleInputChange(null, 'netZeroTargetYear', parseInt(e.target.value) || 2050)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Baseline Year</label>
                    <select
                      className="w-full border-b-2 border-slate-200 focus:border-[#006D5B] bg-transparent pb-1.5 text-sm outline-none focus:ring-0 transition-colors appearance-none"
                      value={inputs.baselineYear}
                      onChange={(e) => handleInputChange(null, 'baselineYear', e.target.value)}
                    >
                      {['2018', '2019', '2020', '2021', '2022', '2023', '2024'].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Reporting Year</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={inputs.reportingYear}
                      onChange={(e) => handleInputChange(null, 'reportingYear', e.target.value)}
                    >
                      {['2023', '2024', '2025', '2026', '2027'].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#006D5B]">Employee Headcount</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006D5B] focus:border-[#006D5B] bg-white mt-1"
                      placeholder="e.g. 50"
                      value={inputs.employeeHeadcount || ''}
                      onChange={(e) => handleInputChange(null, 'employeeHeadcount', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Required for auto-calculating regional and industry UK greenhouse gas benchmarks.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Carbon Reduction Commitment Statement
                    </label>
                    <button
                      type="button"
                      onClick={setStandardCommitment}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      Auto-generate statement
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter official commitment to achieve Net Zero by 2050..."
                    value={inputs.commitmentStatement}
                    onChange={(e) => handleInputChange(null, 'commitmentStatement', e.target.value)}
                  />
                  <p className="text-xs text-slate-400">
                    PPN 06/21 mandates that suppliers publish a clear, formal statement indicating an absolute commitment to Net Zero carbon emissions by 2050 or earlier.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: SCOPE 1 EMISSIONS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Scope 1 (Direct Emissions)
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Direct greenhouse gas emissions arising from company owned operations, combustible fuels, or company fleets.
                  </p>
                </div>

                {/* Onboarding Benchmark Toggle */}
                <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#006D5B]">UK Average Benchmarking</p>
                    <p className="text-xs text-slate-500">
                      Auto-calculate gas consumption based on your <strong>{inputs.employeeHeadcount || 0} employees</strong>.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={useGasBenchmark}
                      onChange={(e) => handleToggleGasBenchmark(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006D5B]"></div>
                    <span className="ml-3 text-xs font-bold text-slate-700">I don't have this data, use UK average benchmarks based on my headcount</span>
                  </label>
                </div>

                {useGasBenchmark && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-emerald-800 leading-relaxed">
                      <strong>CIBSE Benchmark Applied</strong>: This estimation utilizes the official UK CIBSE (Chartered Institution of Building Services Engineers) Guide F average benchmark of <strong>1,200 kWh</strong> of natural gas per employee per year for standard commercial premises.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`space-y-1 p-3 rounded-lg border transition-all ${useGasBenchmark ? 'bg-emerald-50/50 border-emerald-200 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <label className={`text-xs font-bold uppercase tracking-wider ${useGasBenchmark ? 'text-[#006D5B]' : 'text-slate-500'}`}>Natural Gas</label>
                      <span className="text-xs text-slate-400 font-bold">kWh</span>
                    </div>
                    <input
                      type="number"
                      disabled={useGasBenchmark}
                      className={`w-full border rounded-lg p-2 text-sm transition-colors ${useGasBenchmark ? 'bg-[#E8F5E9] text-[#1B5E20] font-black border-emerald-300' : 'bg-white border-slate-200'}`}
                      value={inputs.scope1.naturalGasKwh || ''}
                      placeholder="0"
                      onChange={(e) => handleInputChange('scope1', 'naturalGasKwh', parseFloat(e.target.value) || 0)}
                    />
                    {useGasBenchmark && (
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-1">
                        ★ Auto-populated (1,200 kWh per employee/yr)
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Burning Oil (Heating)</label>
                      <span className="text-xs text-slate-400">Litres</span>
                    </div>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                      value={inputs.scope1.burningOilLitres || ''}
                      placeholder="0"
                      onChange={(e) => handleInputChange('scope1', 'burningOilLitres', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Commercial Diesel</label>
                      <span className="text-xs text-slate-400">Litres</span>
                    </div>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                      value={inputs.scope1.dieselLitres || ''}
                      placeholder="0"
                      onChange={(e) => handleInputChange('scope1', 'dieselLitres', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Commercial Petrol</label>
                      <span className="text-xs text-slate-400">Litres</span>
                    </div>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                      value={inputs.scope1.petrolLitres || ''}
                      placeholder="0"
                      onChange={(e) => handleInputChange('scope1', 'petrolLitres', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Owned Fleets</label>
                      <div className="flex gap-1 border border-slate-200 rounded bg-white p-0.5 text-xs">
                        <button
                          type="button"
                          className={`px-2 py-0.5 rounded ${inputs.scope1.companyOwnedUnit === 'miles' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                          onClick={() => handleInputChange('scope1', 'companyOwnedUnit', 'miles')}
                        >
                          Miles
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-0.5 rounded ${inputs.scope1.companyOwnedUnit === 'km' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                          onClick={() => handleInputChange('scope1', 'companyOwnedUnit', 'km')}
                        >
                          Km
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white mt-1"
                      value={inputs.scope1.companyOwnedKm || ''}
                      placeholder="0"
                      onChange={(e) => handleInputChange('scope1', 'companyOwnedKm', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3 mt-4">
                  <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Calculated Scope 1 Total: {reportingEmissions.scope1.total} tCO₂e</strong>. 
                    Factors are automatically matched against UK Gov 2025 constants for Natural Gas ({EMISSION_FACTORS.scope1.naturalGasKwh} kg/kWh), Diesel ({EMISSION_FACTORS.scope1.dieselLitre} kg/L) and Petrol ({EMISSION_FACTORS.scope1.petrolLitre} kg/L).
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: SCOPE 2 EMISSIONS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Scope 2 (Indirect Grid Emissions)
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Indirect greenhouse gas emissions resulting from purchased grid electricity consumed in corporate buildings and assets.
                  </p>
                </div>

                {/* Electricity Benchmark Toggle */}
                <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#006D5B]">UK Average Benchmarking</p>
                    <p className="text-xs text-slate-500">
                      Auto-calculate electricity consumption based on your <strong>{inputs.employeeHeadcount || 0} employees</strong>.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={useElectricityBenchmark}
                      onChange={(e) => handleToggleElectricityBenchmark(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006D5B]"></div>
                    <span className="ml-3 text-xs font-bold text-slate-700">I don't have this data, use UK average benchmarks based on my headcount</span>
                  </label>
                </div>

                {useElectricityBenchmark && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-emerald-800 leading-relaxed">
                      <strong>CIBSE Electricity Benchmarks Applied</strong>: This estimation utilizes the official UK CIBSE (Chartered Institution of Building Services Engineers) Guide F average benchmark of <strong>950 kWh</strong> of grid electricity per employee per year for commercial offices.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border md:col-span-2 transition-all ${useElectricityBenchmark ? 'bg-emerald-50/50 border-emerald-200 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <label className={`text-sm font-bold uppercase tracking-wider ${useElectricityBenchmark ? 'text-[#006D5B]' : 'text-slate-500'}`}>Purchased Electricity</label>
                      <span className="text-xs text-slate-400 font-bold">kWh</span>
                    </div>
                    <input
                      type="number"
                      disabled={useElectricityBenchmark}
                      className={`w-full border rounded-lg p-2.5 text-sm mt-1 transition-colors ${useElectricityBenchmark ? 'bg-[#E8F5E9] text-[#1B5E20] font-black border-emerald-300' : 'bg-white border-slate-200'}`}
                      value={inputs.scope2.gridElectricityKwh || ''}
                      placeholder="e.g. 52000"
                      onChange={(e) => handleInputChange('scope2', 'gridElectricityKwh', parseFloat(e.target.value) || 0)}
                    />
                    {useElectricityBenchmark && (
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-1">
                        ★ Auto-populated (950 kWh per employee/yr)
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Green Tariff Offsetting</label>
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                      value={inputs.scope2.greenTariffPercentage}
                      onChange={(e) => handleInputChange('scope2', 'greenTariffPercentage', parseInt(e.target.value) || 0)}
                    />
                    <div className="flex justify-between text-xs text-slate-500 font-semibold mt-1">
                      <span>0% (Standard Grid)</span>
                      <span>{inputs.scope2.greenTariffPercentage}% Green REGO</span>
                      <span>100% (REGO Certified)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3 mt-4">
                  <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Calculated Scope 2 Total: {reportingEmissions.scope2.total} tCO₂e</strong>.
                    UK Grid electricity accounts for location-based emission factors at {EMISSION_FACTORS.scope2.electricityGridKwh} kg CO₂e per kWh. 
                    {inputs.scope2.greenTariffPercentage > 0 && ` Market-based calculation reports carbon offsets on REGO contracts showing ${((inputs.scope2.gridElectricityKwh * EMISSION_FACTORS.scope2.electricityGridKwh / 1000) * (inputs.scope2.greenTariffPercentage / 100)).toFixed(2)} tCO₂e potential reduction.`}
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4: SCOPE 3 (PPN 06/21 MANDATORY CATEGORIES) */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Scope 3 (PPN 06/21 Compliance Categories)
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    UK Procurement Policy Note 06/21 strictly requires suppliers to disclose emissions for 5 distinct Scope 3 categories.
                  </p>
                </div>

                {/* Sub-tabs for the 5 categories */}
                <div className="flex flex-wrap border-b border-slate-200 text-xs font-semibold uppercase tracking-wider mb-4">
                  <button
                    type="button"
                    className={`flex-1 min-w-[80px] pb-3 text-center border-b-2 transition-colors ${activeScope3Tab === 'cat4' ? 'border-emerald-600 text-emerald-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveScope3Tab('cat4')}
                  >
                    Cat 4: Upstream
                  </button>
                  <button
                    type="button"
                    className={`flex-1 min-w-[80px] pb-3 text-center border-b-2 transition-colors ${activeScope3Tab === 'cat5' ? 'border-emerald-600 text-emerald-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveScope3Tab('cat5')}
                  >
                    Cat 5: Waste
                  </button>
                  <button
                    type="button"
                    className={`flex-1 min-w-[80px] pb-3 text-center border-b-2 transition-colors ${activeScope3Tab === 'cat6' ? 'border-emerald-600 text-emerald-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveScope3Tab('cat6')}
                  >
                    Cat 6: Travel
                  </button>
                  <button
                    type="button"
                    className={`flex-1 min-w-[80px] pb-3 text-center border-b-2 transition-colors ${activeScope3Tab === 'cat7' ? 'border-emerald-600 text-emerald-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveScope3Tab('cat7')}
                  >
                    Cat 7: Commute
                  </button>
                  <button
                    type="button"
                    className={`flex-1 min-w-[80px] pb-3 text-center border-b-2 transition-colors ${activeScope3Tab === 'cat9' ? 'border-emerald-600 text-emerald-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveScope3Tab('cat9')}
                  >
                    Cat 9: Downstream
                  </button>
                </div>

                {/* Sub Tab Contents */}
                <div className="min-h-[220px]">
                  {/* Category 4 */}
                  {activeScope3Tab === 'cat4' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800">Category 4: Upstream Transportation & Distribution</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Transportation of purchased products and goods from suppliers to your assets.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-slate-500">Heavy Goods Vehicles (HGV)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat4.hgvTonneKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat4', 'hgvTonneKm', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400">Total goods mass (tonnes) x distance moved (km)</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-slate-500">Van / Light Delivery Courier</label>
                            <div className="flex gap-1 border border-slate-200 rounded bg-white p-0.5 text-[10px]">
                              <button
                                type="button"
                                className={`px-1.5 py-0.5 rounded ${inputs.scope3Cat4.vanUnit === 'miles' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat4', 'vanUnit', 'miles')}
                              >
                                Miles
                              </button>
                              <button
                                type="button"
                                className={`px-1.5 py-0.5 rounded ${inputs.scope3Cat4.vanUnit === 'km' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat4', 'vanUnit', 'km')}
                              >
                                Km
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm mt-0.5"
                            placeholder="0"
                            value={inputs.scope3Cat4.vanKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat4', 'vanKm', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400">Total distance traveled by delivery vans</p>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Flat rate / Verified Invoice CO₂e Override</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                            placeholder="0.0"
                            value={inputs.scope3Cat4.flatTCO2e || ''}
                            onChange={(e) => handleInputChange('scope3Cat4', 'flatTCO2e', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400">Directly add pre-calculated tCO₂e values from carbon-offset delivery invoices.</p>
                        </div>

                        <div className="space-y-1 md:col-span-2 border-t border-slate-100 pt-3">
                          <label className="text-xs font-bold uppercase text-slate-500">Methodology Basis / Calculation Notes</label>
                          <textarea
                            rows={2}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006D5B] focus:border-[#006D5B] bg-white mt-1"
                            placeholder="Leave blank to automatically generate standard UK Government PPN-compliant description..."
                            value={inputs.scope3Cat4.methodologyBasis || ''}
                            onChange={(e) => handleInputChange('scope3Cat4', 'methodologyBasis', e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400">Specify any custom sampling techniques, supplier verification data, or data gaps addressed.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 5 */}
                  {activeScope3Tab === 'cat5' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800">Category 5: Waste Generated in Operations</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Disposal and treatment of waste generated in your organization's owned or controlled operations.</p>
                      </div>

                      {/* Waste Benchmark Toggle */}
                      <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#006D5B]">UK Average Benchmarking</p>
                          <p className="text-xs text-slate-500">
                            Auto-calculate operational waste based on your <strong>{inputs.employeeHeadcount || 0} employees</strong>.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={useWasteBenchmark}
                            onChange={(e) => handleToggleWasteBenchmark(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006D5B]"></div>
                          <span className="ml-3 text-xs font-bold text-slate-700">I don't have this data, use UK average benchmarks based on my headcount</span>
                        </label>
                      </div>

                      {useWasteBenchmark && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                          <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-emerald-800 leading-relaxed">
                            <strong>UK Waste Benchmark Applied</strong>: This estimation utilizes the standard UK waste generation statistics of approximately <strong>0.2 tonnes</strong> of waste per employee per year for office environments, allocated 50% to general landfill waste and 50% to recycling streams.
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className={`space-y-1 p-2 rounded-lg border transition-all ${useWasteBenchmark ? 'bg-emerald-50/50 border-emerald-200 shadow-inner' : 'bg-transparent border-transparent'}`}>
                          <label className={`text-xs font-bold uppercase ${useWasteBenchmark ? 'text-[#006D5B]' : 'text-slate-500'}`}>Landfill Waste (Tonnes)</label>
                          <input
                            type="number"
                            disabled={useWasteBenchmark}
                            className={`w-full border rounded-lg p-2 text-sm ${useWasteBenchmark ? 'bg-[#E8F5E9] text-[#1B5E20] font-black border-emerald-300' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat5.landfillTonnes || ''}
                            onChange={(e) => handleInputChange('scope3Cat5', 'landfillTonnes', parseFloat(e.target.value) || 0)}
                          />
                          {useWasteBenchmark && (
                            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-1">
                              ★ Auto-populated (0.1 t/employee/yr)
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 p-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Combusted / Incinerated (Tonnes)</label>
                          <input
                            type="number"
                            disabled={useWasteBenchmark}
                            className={`w-full border rounded-lg p-2 text-sm ${useWasteBenchmark ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat5.combustedTonnes || ''}
                            onChange={(e) => handleInputChange('scope3Cat5', 'combustedTonnes', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className={`space-y-1 p-2 rounded-lg border transition-all ${useWasteBenchmark ? 'bg-emerald-50/50 border-emerald-200 shadow-inner' : 'bg-transparent border-transparent'}`}>
                          <label className={`text-xs font-bold uppercase ${useWasteBenchmark ? 'text-[#006D5B]' : 'text-slate-500'}`}>Recycled Waste (Tonnes)</label>
                          <input
                            type="number"
                            disabled={useWasteBenchmark}
                            className={`w-full border rounded-lg p-2 text-sm ${useWasteBenchmark ? 'bg-[#E8F5E9] text-[#1B5E20] font-black border-emerald-300' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat5.recycledTonnes || ''}
                            onChange={(e) => handleInputChange('scope3Cat5', 'recycledTonnes', parseFloat(e.target.value) || 0)}
                          />
                          {useWasteBenchmark && (
                            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-1">
                              ★ Auto-populated (0.1 t/employee/yr)
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 p-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Organic Composted (Tonnes)</label>
                          <input
                            type="number"
                            disabled={useWasteBenchmark}
                            className={`w-full border rounded-lg p-2 text-sm ${useWasteBenchmark ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat5.compostedTonnes || ''}
                            onChange={(e) => handleInputChange('scope3Cat5', 'compostedTonnes', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3 mt-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Methodology Basis / Calculation Notes</label>
                          <textarea
                            rows={2}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006D5B] focus:border-[#006D5B] bg-white mt-1"
                            placeholder="Leave blank to automatically generate standard UK Government PPN-compliant description..."
                            value={inputs.scope3Cat5.methodologyBasis || ''}
                            onChange={(e) => handleInputChange('scope3Cat5', 'methodologyBasis', e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400">Specify any custom waste tracking databases, dumpster volume estimations, or supplier data sheets used.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 6 */}
                  {activeScope3Tab === 'cat6' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800">Category 6: Business Travel</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Transportation of employees for business-related activities (excluding commuting) in third-party vehicles.</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-slate-500">National Rail (p-km)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-1.5 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat6.railPkm || ''}
                            onChange={(e) => handleInputChange('scope3Cat6', 'railPkm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-slate-500">Domestic Flights (p-km)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-1.5 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat6.domesticFlightPkm || ''}
                            onChange={(e) => handleInputChange('scope3Cat6', 'domesticFlightPkm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-slate-500">Europe Flights (p-km)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-1.5 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat6.shortHaulFlightPkm || ''}
                            onChange={(e) => handleInputChange('scope3Cat6', 'shortHaulFlightPkm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-slate-500">Long Haul Flights (p-km)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-1.5 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat6.longHaulFlightPkm || ''}
                            onChange={(e) => handleInputChange('scope3Cat6', 'longHaulFlightPkm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1 col-span-2 md:col-span-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold uppercase text-slate-500">Personal Car Claim</label>
                            <div className="flex gap-1 border border-slate-200 rounded bg-white p-0.5 text-[8px]">
                              <button
                                type="button"
                                className={`px-1 rounded ${inputs.scope3Cat6.carUnit === 'miles' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat6', 'carUnit', 'miles')}
                              >
                                M
                              </button>
                              <button
                                type="button"
                                className={`px-1 rounded ${inputs.scope3Cat6.carUnit === 'km' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat6', 'carUnit', 'km')}
                              >
                                K
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-1.5 text-sm mt-0.5"
                            placeholder="0"
                            value={inputs.scope3Cat6.carKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat6', 'carKm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-slate-500">Bus / Coach (p-km)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-1.5 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat6.busPkm || ''}
                            onChange={(e) => handleInputChange('scope3Cat6', 'busPkm', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        * p-km (Passenger-Kilometre) corresponds to total distance traveled multiplied by number of corporate passengers.
                      </p>

                      <div className="space-y-1 border-t border-slate-100 pt-3 mt-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Methodology Basis / Calculation Notes</label>
                        <textarea
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006D5B] focus:border-[#006D5B] bg-white mt-1"
                          placeholder="Leave blank to automatically generate standard UK Government PPN-compliant description..."
                          value={inputs.scope3Cat6.methodologyBasis || ''}
                          onChange={(e) => handleInputChange('scope3Cat6', 'methodologyBasis', e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400">Specify travel agent report imports, mileage expense claims database sources, or airline class radiative forcing adjustments applied.</p>
                      </div>
                    </div>
                  )}

                  {/* Category 7 */}
                  {activeScope3Tab === 'cat7' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800">Category 7: Employee Commuting</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Transportation of employees between their homes and worksites, including working from home / teleworking energy.</p>
                      </div>

                      {/* Commute Benchmark Toggle */}
                      <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#006D5B]">UK Average Benchmarking</p>
                          <p className="text-xs text-slate-500">
                            Auto-calculate travel distance based on your <strong>{inputs.employeeHeadcount || 0} employees</strong>.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={useCommutingBenchmark}
                            onChange={(e) => handleToggleCommutingBenchmark(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006D5B]"></div>
                          <span className="ml-3 text-xs font-bold text-slate-700">I don't have this data, use UK average benchmarks based on my headcount</span>
                        </label>
                      </div>

                      {useCommutingBenchmark && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                          <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-emerald-800 leading-relaxed">
                            <strong>UK DfT Commuting Benchmark Applied</strong>: This estimation utilizes the UK Department for Transport (DfT) National Travel Survey average commute distance of approximately <strong>1,007 miles</strong> per employee per year for private transport users.
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className={`space-y-1 col-span-2 p-2 rounded-lg border transition-all ${useCommutingBenchmark ? 'bg-emerald-50/50 border-emerald-200 shadow-inner' : 'bg-transparent border-transparent'}`}>
                          <div className="flex justify-between items-center">
                            <label className={`text-xs font-bold uppercase ${useCommutingBenchmark ? 'text-[#006D5B]' : 'text-slate-500'}`}>Commuting by Private Car</label>
                            <div className="flex gap-1 border border-slate-200 rounded bg-white p-0.5 text-[8px]">
                              <button
                                type="button"
                                disabled={useCommutingBenchmark}
                                className={`px-1 rounded ${inputs.scope3Cat7.commuteCarUnit === 'miles' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat7', 'commuteCarUnit', 'miles')}
                              >
                                M
                              </button>
                              <button
                                type="button"
                                disabled={useCommutingBenchmark}
                                className={`px-1 rounded ${inputs.scope3Cat7.commuteCarUnit === 'km' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat7', 'commuteCarUnit', 'km')}
                              >
                                K
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            disabled={useCommutingBenchmark}
                            className={`w-full border rounded-lg p-1.5 text-sm mt-0.5 ${useCommutingBenchmark ? 'bg-[#E8F5E9] text-[#1B5E20] font-black border-emerald-300' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat7.commuteCarKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat7', 'commuteCarKm', parseFloat(e.target.value) || 0)}
                          />
                          {useCommutingBenchmark && (
                            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-1">
                              ★ Auto-populated (1,007 miles/employee/yr)
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 p-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Commuting Rail (km)</label>
                          <input
                            type="number"
                            disabled={useCommutingBenchmark}
                            className={`w-full border rounded-lg p-1.5 text-sm ${useCommutingBenchmark ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat7.commuteRailKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat7', 'commuteRailKm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1 p-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Commuting Bus (km)</label>
                          <input
                            type="number"
                            disabled={useCommutingBenchmark}
                            className={`w-full border rounded-lg p-1.5 text-sm ${useCommutingBenchmark ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200'}`}
                            placeholder="0"
                            value={inputs.scope3Cat7.commuteBusKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat7', 'commuteBusKm', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1 col-span-2 md:col-span-4 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700">Home Working / Teleworking Allowance</label>
                            <span className="text-[10px] text-slate-500 font-medium">0.34 kg CO₂e per working day</span>
                          </div>
                          <input
                            type="number"
                            disabled={useCommutingBenchmark}
                            className={`w-full border border-slate-200 rounded-lg p-1.5 text-sm bg-white mt-1 ${useCommutingBenchmark ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white'}`}
                            placeholder="e.g. 180"
                            value={inputs.scope3Cat7.wfhDays || ''}
                            onChange={(e) => handleInputChange('scope3Cat7', 'wfhDays', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Sum of remote days worked across all employees. Accounts for incremental heating and power usage as recommended by modern carbon accounting standards.
                          </p>
                        </div>

                        <div className="space-y-1 col-span-2 md:col-span-4 border-t border-slate-100 pt-3 mt-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Methodology Basis / Calculation Notes</label>
                          <textarea
                            rows={2}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006D5B] focus:border-[#006D5B] bg-white mt-1"
                            placeholder="Leave blank to automatically generate standard UK Government PPN-compliant description..."
                            value={inputs.scope3Cat7.methodologyBasis || ''}
                            onChange={(e) => handleInputChange('scope3Cat7', 'methodologyBasis', e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400">Specify any commuting surveys administered, average distance estimations, or teleworking energy calculation models used.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 9 */}
                  {activeScope3Tab === 'cat9' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800">Category 9: Downstream Transportation & Distribution</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Transportation of sold products from your corporate sites to the end consumer or client.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-slate-500">Heavy Goods Vehicles (HGV)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                            placeholder="0"
                            value={inputs.scope3Cat9.hgvTonneKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat9', 'hgvTonneKm', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400">Total downstream mass (tonnes) x distance moved (km)</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-slate-500">Van Couriers / Delivery Fleet</label>
                            <div className="flex gap-1 border border-slate-200 rounded bg-white p-0.5 text-[10px]">
                              <button
                                type="button"
                                className={`px-1.5 py-0.5 rounded ${inputs.scope3Cat9.vanUnit === 'miles' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat9', 'vanUnit', 'miles')}
                              >
                                Miles
                              </button>
                              <button
                                type="button"
                                className={`px-1.5 py-0.5 rounded ${inputs.scope3Cat9.vanUnit === 'km' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600'}`}
                                onClick={() => handleInputChange('scope3Cat9', 'vanUnit', 'km')}
                              >
                                Km
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm mt-0.5"
                            placeholder="0"
                            value={inputs.scope3Cat9.vanKm || ''}
                            onChange={(e) => handleInputChange('scope3Cat9', 'vanKm', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400">Total downstream vehicle distances</p>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold uppercase text-slate-500">Flat rate / Verified Invoice CO₂e Override</label>
                          <input
                            type="number"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                            placeholder="0.0"
                            value={inputs.scope3Cat9.flatTCO2e || ''}
                            onChange={(e) => handleInputChange('scope3Cat9', 'flatTCO2e', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-[10px] text-slate-400">Directly add pre-calculated tCO₂e values from downstream logistics providers.</p>
                        </div>

                        <div className="space-y-1 md:col-span-2 border-t border-slate-100 pt-3">
                          <label className="text-xs font-bold uppercase text-slate-500">Methodology Basis / Calculation Notes</label>
                          <textarea
                            rows={2}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006D5B] focus:border-[#006D5B] bg-white mt-1"
                            placeholder="Leave blank to automatically generate standard UK Government PPN-compliant description..."
                            value={inputs.scope3Cat9.methodologyBasis || ''}
                            onChange={(e) => handleInputChange('scope3Cat9', 'methodologyBasis', e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400">Specify any downstream carrier logistics data sets, weight-mileage estimations, or distributor telemetry logs analyzed.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3 mt-4">
                  <svg className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Total Scope 3 Compliance Emissions: {reportingEmissions.scope3.total} tCO₂e</strong>
                    <div className="grid grid-cols-2 gap-2 mt-1 font-semibold text-[10px] text-emerald-700">
                      <span>• Cat 4: {reportingEmissions.scope3.cat4UpstreamTrans} tCO₂e</span>
                      <span>• Cat 5: {reportingEmissions.scope3.cat5OperationalWaste} tCO₂e</span>
                      <span>• Cat 6: {reportingEmissions.scope3.cat6BusinessTravel} tCO₂e</span>
                      <span>• Cat 7: {reportingEmissions.scope3.cat7EmployeeCommuting} tCO₂e</span>
                      <span>• Cat 9: {reportingEmissions.scope3.cat9DownstreamTrans} tCO₂e</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REDUCTION INITIATIVES */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Carbon Reduction Initiatives
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Describe environmental management measures and carbon reduction projects implemented or planned to meet compliance standards.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Planned & Implemented Projects
                    </label>
                    <textarea
                      rows={5}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="e.g. In order to achieve the emissions reductions, we have implemented ISO 14001 certification across all offices, transitioned our corporate fleet to 100% electric vehicles, and installed automatic LED lighting controls..."
                      value={inputs.plannedReductions}
                      onChange={(e) => handleInputChange(null, 'plannedReductions', e.target.value)}
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Common Compliance Projects (Click to add)</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        'Achieved ISO 14001 Environmental Management certification.',
                        'Transitioned 100% of corporate heating and electricity contracts to certified green REGO tariffs.',
                        'Upgraded building thermal insulations and deployed high-efficiency LED automated lighting systems.',
                        'Mandated standard public-transit-first business travel guidelines, reducing flight miles by 30%.',
                        'Implemented comprehensive cycle-to-work schemes and installed charging docks for commuter EVs.',
                      ].map((project, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 p-2 rounded-lg text-left transition-colors font-medium shadow-sm"
                          onClick={() => {
                            const separator = inputs.plannedReductions ? '\n\n' : '';
                            handleInputChange(null, 'plannedReductions', inputs.plannedReductions + separator + project);
                          }}
                        >
                          + {project}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: COMPLIANCE PLAN REPORT & DOWNLOAD */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Compliance Dashboard & PPN 06/21 Plan
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Your formal compliance statement and carbon reduction plan. Scroll down to review the formatted document or print/save as PDF.
                  </p>
                </div>

                {/* Baseline Year Config Block */}
                {!baselineInputs ? (
                  <div className="p-6 border border-amber-200 bg-amber-50 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Baseline Year Emissions Required</h4>
                        <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                          PPN 06/21 compliance reports are compared against a historical baseline year. You must configure baseline data to complete the Carbon Reduction Plan.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleAutoGenerateBaseline}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                      >
                        Auto-Generate Benchmark Baseline (+25%)
                      </button>
                      <button
                        type="button"
                        onClick={handleEnableManualBaseline}
                        className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
                      >
                        Manually Configure Baseline
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Comparison vs Baseline Year ({inputs.baselineYear})</h4>
                      <button
                        type="button"
                        onClick={() => setBaselineInputs(null)}
                        className="text-xs text-slate-500 hover:text-red-600 font-medium"
                      >
                        Reset Baseline
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Baseline Year</p>
                        <p className="text-lg font-extrabold text-slate-700">{baselineEmissions?.grandTotal} tCO₂e</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Reporting Year</p>
                        <p className="text-lg font-extrabold text-emerald-700">{reportingEmissions.grandTotal} tCO₂e</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Reduction</p>
                        <p className={`text-lg font-extrabold ${emissionsChangePercentage && emissionsChangePercentage <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {emissionsChangePercentage ? `${emissionsChangePercentage.toFixed(1)}%` : '0.0%'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stepper controls */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 mt-8">
            {saveMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold leading-relaxed border ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}
              >
                {saveMessage}
              </div>
            )}
            <div className="flex justify-between items-center w-full flex-wrap gap-4">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Previous Step
              </button>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Always-accessible Save Progress button */}
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={saveStatus === 'saving'}
                  className="border border-emerald-600 hover:border-emerald-700 text-emerald-700 hover:bg-emerald-50/50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Saved!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Progress
                    </>
                  )}
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                  >
                    Next Step
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                ) : (
                  <>
                    {!isUnlocked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowPreviewModal(true)}
                          className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Preview
                        </button>
                        <button
                          type="button"
                          onClick={handleUnlockPDF}
                          disabled={isUnlocking}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-300 text-white text-xs font-extrabold uppercase tracking-wider px-6 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2 animate-pulse"
                        >
                          <svg className="w-4 h-4 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {isUnlocking ? 'Unlocking...' : 'Unlock Official Board-Approved PDF'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleDownloadPDF}
                          disabled={isDownloading}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                        >
                          {isDownloading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download PPN PDF
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Print
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Audit Dashboard & Visuals */}
        <div className="space-y-6">
          {/* Supabase Save & Resume Widget */}
          <SupabaseAuth onSessionActive={setCurrentUser} />

          {/* Compliance Guarantee Badge */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-emerald-100 opacity-40 pointer-events-none">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">
                ✓
              </span>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Compliance Guarantee
              </h4>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
              Calculations aligned with the 2026 DESNZ Greenhouse Gas Conversion Factors and the UK Cabinet Office PPN 06/21 Annex A methodology.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setShowMethodologyModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-extrabold underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-500 transition-all flex items-center gap-1"
              >
                Verify Methodology
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Emission breakdown chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 border-b border-slate-100 pb-2">
              Live Emissions Summary
            </h3>

            <div className="space-y-3">
              {/* Scope 1 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Scope 1 (Direct)</span>
                  <span>{reportingEmissions.scope1.total} tCO₂e</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${reportingEmissions.grandTotal > 0 ? (reportingEmissions.scope1.total / reportingEmissions.grandTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Scope 2 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Scope 2 (Indirect)</span>
                  <span>{reportingEmissions.scope2.total} tCO₂e</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${reportingEmissions.grandTotal > 0 ? (reportingEmissions.scope2.total / reportingEmissions.grandTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Scope 3 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Scope 3 (PPN 06/21)</span>
                  <span>{reportingEmissions.scope3.total} tCO₂e</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${reportingEmissions.grandTotal > 0 ? (reportingEmissions.scope3.total / reportingEmissions.grandTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Greenhouse Gas Footprint</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{reportingEmissions.grandTotal} tCO₂e</p>
            </div>
          </div>

          {/* Sub-breakdown of Scope 3 mandatory PPN categories */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 border-b border-slate-100 pb-2">
              Scope 3 Compliance Breakdown
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { label: 'Cat 4: Upstream Dist', value: reportingEmissions.scope3.cat4UpstreamTrans, color: 'bg-emerald-500' },
                { label: 'Cat 5: Waste generated', value: reportingEmissions.scope3.cat5OperationalWaste, color: 'bg-teal-500' },
                { label: 'Cat 6: Business Travel', value: reportingEmissions.scope3.cat6BusinessTravel, color: 'bg-indigo-500' },
                { label: 'Cat 7: Commuting & WFH', value: reportingEmissions.scope3.cat7EmployeeCommuting, color: 'bg-cyan-500' },
                { label: 'Cat 9: Downstream Dist', value: reportingEmissions.scope3.cat9DownstreamTrans, color: 'bg-sky-500' },
              ].map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-600">
                    <span>{cat.label}</span>
                    <span>{cat.value} tCO₂e</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${cat.color} h-full rounded-full`}
                      style={{
                        width: `${reportingEmissions.scope3.total > 0 ? (cat.value / reportingEmissions.scope3.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines and Audit Help Box */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-3">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Cabinet Office Guidelines
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              To submit bid proposals for government contracts with values exceeding £5M/year, suppliers must publish a PPN 06/21 Carbon Reduction Plan.
            </p>
            <p className="text-xs text-slate-400">
              Plans must be updated annually, approved by the Board, and signed by a director, listing emissions from Scopes 1, 2, and the 5 Scope 3 sub-categories explicitly.
            </p>
          </div>
        </div>
      </div>

      {/* RENDER FORMAL PPN 06/21 COMPLIANCE PDF REPORT TEMPLATE */}
      <div id="compliance-plan-document" className="bg-white border-2 border-slate-300 rounded-3xl p-8 md:p-12 shadow-xl space-y-8 print:border-0 print:shadow-none print:p-0">
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
          <p className="text-xs font-bold text-emerald-700 tracking-widest uppercase">
            Official Compliance Statement
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Carbon Reduction Plan
          </h2>
          <p className="text-slate-500 text-sm">
            Prepared in accordance with Procurement Policy Note PPN 06/21
          </p>
        </div>

        {/* Plan Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 pb-6 text-sm">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold uppercase text-xs">Supplier Name</p>
            <p className="font-bold text-slate-800 text-lg">{inputs.organizationName || 'Not Set (Please fill step 1)'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-bold uppercase text-xs">Publication Date</p>
            <p className="font-bold text-slate-800 text-lg">{new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Commitment Statement */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
            1. Commitment to achieving Net Zero
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-200">
            &ldquo;{inputs.commitmentStatement || 'No commitment statement provided.'}&rdquo;
          </p>
        </div>

        {/* Baseline Year Emissions Table */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
            2. Baseline Year Emissions Footprint
          </h3>
          <p className="text-sm text-slate-600">
            Baseline emissions are a record of the greenhouse gases that have been produced in the past, prior to the introduction of any carbon reduction strategies. They serve as the reference point against which emissions reductions are measured.
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-bold">Baseline Year: {inputs.baselineYear}</th>
                  <th className="p-3 font-bold text-right">Emissions (tCO₂e)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 text-slate-700 font-medium">Scope 1 (Direct Emissions)</td>
                  <td className="p-3 text-right font-bold text-slate-800">
                    {baselineEmissions ? baselineEmissions.scope1.total : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700 font-medium">Scope 2 (Indirect Grid)</td>
                  <td className="p-3 text-right font-bold text-slate-800">
                    {baselineEmissions ? baselineEmissions.scope2.total : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700 font-medium" colSpan={2}>
                    <div className="font-semibold">Scope 3 (Included Categories under PPN 06/21)</div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-4 space-y-1">
                      <p>• Category 4 Upstream Dist: {baselineEmissions ? baselineEmissions.scope3.cat4UpstreamTrans : '—'} tCO₂e</p>
                      <p>• Category 5 Operational Waste: {baselineEmissions ? baselineEmissions.scope3.cat5OperationalWaste : '—'} tCO₂e</p>
                      <p>• Category 6 Business Travel: {baselineEmissions ? baselineEmissions.scope3.cat6BusinessTravel : '—'} tCO₂e</p>
                      <p>• Category 7 Employee Commuting: {baselineEmissions ? baselineEmissions.scope3.cat7EmployeeCommuting : '—'} tCO₂e</p>
                      <p>• Category 9 Downstream Dist: {baselineEmissions ? baselineEmissions.scope3.cat9DownstreamTrans : '—'} tCO₂e</p>
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">Total Baseline Emissions</td>
                  <td className="p-3 text-right font-black text-slate-900 text-base">
                    {baselineEmissions ? `${baselineEmissions.grandTotal} tCO₂e` : 'Pending Setup'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Year Emissions Table */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
            3. Current Reporting Year Emissions Footprint
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-bold">Reporting Year: {inputs.reportingYear}</th>
                  <th className="p-3 font-bold text-right">Emissions (tCO₂e)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 text-slate-700 font-medium">Scope 1 (Direct Emissions)</td>
                  <td className="p-3 text-right font-bold text-slate-800">{reportingEmissions.scope1.total}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700 font-medium">Scope 2 (Indirect Grid)</td>
                  <td className="p-3 text-right font-bold text-slate-800">{reportingEmissions.scope2.total}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700 font-medium" colSpan={2}>
                    <div className="font-semibold">Scope 3 (Included Categories under PPN 06/21)</div>
                    <div className="text-[11px] text-slate-400 mt-1 pl-4 space-y-1">
                      <p>• Category 4 Upstream Dist: {reportingEmissions.scope3.cat4UpstreamTrans} tCO₂e</p>
                      <p>• Category 5 Operational Waste: {reportingEmissions.scope3.cat5OperationalWaste} tCO₂e</p>
                      <p>• Category 6 Business Travel: {reportingEmissions.scope3.cat6BusinessTravel} tCO₂e</p>
                      <p>• Category 7 Employee Commuting: {reportingEmissions.scope3.cat7EmployeeCommuting} tCO₂e</p>
                      <p>• Category 9 Downstream Dist: {reportingEmissions.scope3.cat9DownstreamTrans} tCO₂e</p>
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">Total Reporting Emissions</td>
                  <td className="p-3 text-right font-black text-slate-900 text-base">{reportingEmissions.grandTotal} tCO₂e</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Projects / Reduction Targets text box */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
            4. Carbon Reduction Projects & Initiatives
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {inputs.plannedReductions ||
              'No projects detailed. Please add implemented environmental projects and certification scopes in Step 5.'}
          </p>
        </div>

        {/* Board Approval Sign off */}
        <div className="space-y-6 pt-6 border-t border-slate-200 relative">
          <h3 className="text-lg font-bold text-slate-900">
            5. Declaration and Sign-off
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            This Carbon Reduction Plan has been completed in accordance with PPN 06/21 and associated guidance and reporting methodology for Carbon Reduction Plans. Emissions have been reported and recorded in accordance with the published reporting standard for Carbon Reduction Plans and the GHG Reporting Protocol corporate standard.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            This Carbon Reduction Plan has been reviewed and signed off by the board of directors (or equivalent management body).
          </p>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 text-sm relative ${!isUnlocked ? 'filter blur-[3px] select-none pointer-events-none' : ''}`}>
            <div className="border-t border-slate-300 pt-3 space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase">Signed on behalf of the Supplier:</p>
              <div className="h-10 flex items-end">
                <span className="italic text-slate-500">Representative signature</span>
              </div>
              <p className="font-bold text-slate-700 mt-2">Director / Board Representative</p>
              <p className="text-xs text-slate-400">Title / Position</p>
            </div>

            <div className="border-t border-slate-300 pt-3 space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase">Date of Sign-off:</p>
              <div className="h-10 flex items-end">
                <span className="font-bold text-slate-700">{new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          {!isUnlocked && (
            <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] flex items-center justify-center rounded-xl p-6">
              <div className="bg-white/95 border border-slate-200 shadow-xl rounded-2xl p-6 text-center max-w-sm space-y-3 z-10">
                <div className="bg-amber-100 text-amber-800 rounded-full w-10 h-10 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Official Sign-off Block Locked
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your carbon calculations and trajectory reports are ready. Unlock to generate high-contrast signature lines, remove watermarks, and download the full compliant PPN PDF.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Preview Document
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlockPDF}
                    disabled={isUnlocking}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Unlock PDF (£195)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden container for PDF rendering */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden', height: 0 }}>
        <OfficialCRPTemplate
          ref={pdfTemplateRef}
          inputs={inputs}
          baselineEmissions={baselineEmissions}
          reportingEmissions={reportingEmissions}
          emissionsChangePercentage={emissionsChangePercentage}
          isPreview={!isUnlocked}
          useWasteBenchmark={useWasteBenchmark}
          useCommutingBenchmark={useCommutingBenchmark}
        />
      </div>

      {/* Methodology Verification Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowMethodologyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="bg-emerald-100 text-emerald-800 rounded-full p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Methodology Verification
                </h3>
                <p className="text-xs text-slate-500">Compliance & Calculation Standards</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Our assessment engine is custom-configured to provide complete compliance with the 
                <strong> Greenhouse Gas Protocol Corporate Standard</strong>, the global standard for carbon footprint reporting.
              </p>
              <p>
                We execute calculation pipelines following these strict parameters:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Scope 1:</strong> Natural Gas usage mapped against official 2026 DESNZ Direct Emission factors (expressed in kgCO₂e per kWh).</li>
                <li><strong>Scope 2:</strong> Grid electricity calculated via Location-based grid factors aligned with 2026 DESNZ grid intensity metrics.</li>
                <li><strong>Scope 3:</strong> Includes all five mandatory categories under UK Procurement Policy Note PPN 06/21: Upstream Transportation & Distribution (Cat 4), Operational Waste (Cat 5), Business Travel (Cat 6), Employee Commuting (Cat 7), and Downstream Transportation & Distribution (Cat 9).</li>
              </ul>
              <p className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-emerald-950 font-medium">
                Every calculation is validated to confirm full mathematical correctness, removing audit-readiness risk for corporate public tenders.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowMethodologyModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal (Watermarked CRP Plan) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl max-w-4xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Watermarked Preview
                </span>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                  Your Carbon Reduction Plan Trajectory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Container with the actual watermarked document */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex justify-center">
              <div className="bg-white shadow-lg rounded-2xl overflow-hidden p-2">
                <OfficialCRPTemplate
                  inputs={inputs}
                  baselineEmissions={baselineEmissions}
                  reportingEmissions={reportingEmissions}
                  emissionsChangePercentage={emissionsChangePercentage}
                  isPreview={true}
                  useWasteBenchmark={useWasteBenchmark}
                  useCommutingBenchmark={useCommutingBenchmark}
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky bottom-0 z-10 shadow-lg">
              <p className="text-xs text-slate-500 max-w-md">
                This is a secure preview. Unlock the official Board-Approved PDF to get high-contrast signature lines, remove all watermarks, and download/print your ready-to-file CRP.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  disabled={isUnlocking}
                  onClick={handleUnlockPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                >
                  {isUnlocking ? 'Unlocking...' : 'Unlock Official Board-Approved PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to resolve clean step titles
function getStepName(step: number): string {
  switch (step) {
    case 1: return 'Strategy & Target Setting';
    case 2: return 'Scope 1: Direct Operations';
    case 3: return 'Scope 2: Purchased Energy';
    case 4: return 'Scope 3: Mandatory PPN Categories';
    case 5: return 'Carbon Reduction Initiatives';
    case 6: return 'Compliance Report & Sign-off';
    default: return '';
  }
}
