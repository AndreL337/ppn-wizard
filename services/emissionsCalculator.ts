/**
 * UK Gov GHG Conversion Factors & Calculation Service for PPN 06/21 Compliance
 * Based on the latest UK Government Greenhouse Gas Conversion Factors for Company Reporting (2025/2026).
 */

export interface Scope1Inputs {
  naturalGasKwh: number;
  burningOilLitres: number;
  dieselLitres: number;
  petrolLitres: number;
  companyOwnedKm: number;
  companyOwnedUnit: 'km' | 'miles';
}

export interface Scope2Inputs {
  gridElectricityKwh: number;
  greenTariffPercentage: number; // For information and market-based calculations
}

export interface Scope3Category4Inputs {
  hgvTonneKm: number;
  vanKm: number;
  vanUnit: 'km' | 'miles';
  flatTCO2e: number;
  methodologyBasis?: string;
}

export interface Scope3Category5Inputs {
  landfillTonnes: number;
  combustedTonnes: number;
  recycledTonnes: number;
  compostedTonnes: number;
  methodologyBasis?: string;
}

export interface Scope3Category6Inputs {
  domesticFlightPkm: number; // Passenger-km
  shortHaulFlightPkm: number;
  longHaulFlightPkm: number;
  railPkm: number;
  carKm: number;
  carUnit: 'km' | 'miles';
  busPkm: number;
  methodologyBasis?: string;
}

export interface Scope3Category7Inputs {
  commuteCarKm: number;
  commuteCarUnit: 'km' | 'miles';
  commuteRailKm: number;
  commuteBusKm: number;
  wfhDays: number; // Work from home days (for teleworking emissions)
  methodologyBasis?: string;
}

export interface Scope3Category9Inputs {
  hgvTonneKm: number;
  vanKm: number;
  vanUnit: 'km' | 'miles';
  flatTCO2e: number;
  methodologyBasis?: string;
}

export interface CarbonWizardInputs {
  organizationName: string;
  baselineYear: string;
  reportingYear: string;
  netZeroTargetYear: number;
  commitmentStatement: string;
  employeeHeadcount: number;
  scope1: Scope1Inputs;
  scope2: Scope2Inputs;
  scope3Cat4: Scope3Category4Inputs;
  scope3Cat5: Scope3Category5Inputs;
  scope3Cat6: Scope3Category6Inputs;
  scope3Cat7: Scope3Category7Inputs;
  scope3Cat9: Scope3Category9Inputs;
  plannedReductions: string;
}

export type RawAuditInputs = CarbonWizardInputs;

export interface EmissionsBreakdown {
  scope1: {
    naturalGas: number;
    burningOil: number;
    diesel: number;
    petrol: number;
    companyOwned: number;
    total: number;
  };
  scope2: {
    gridElectricity: number;
    total: number;
  };
  scope3: {
    cat4UpstreamTrans: number;
    cat5OperationalWaste: number;
    cat6BusinessTravel: number;
    cat7EmployeeCommuting: number;
    cat9DownstreamTrans: number;
    total: number;
  };
  grandTotal: number;
}

import factors2026 from './factors/2026.json';

export const EmissionLibrary = {
  '2026': factors2026,
};

// UK Government Conversion Factors (kg CO2e per unit) - Default 2026 factors
export const EMISSION_FACTORS = factors2026;

const MILES_TO_KM = 1.609344;

function convertDistanceToKm(value: number, unit: 'km' | 'miles'): number {
  return unit === 'miles' ? value * MILES_TO_KM : value;
}

/**
 * Calculates emissions based on UK Gov GHG Conversion Factors.
 * Returns emissions in metric Tonnes of CO2e (tCO2e) which is the required unit for PPN 06/21.
 */
export function calculateEmissions(inputs: CarbonWizardInputs, version: string = '2026'): EmissionsBreakdown {
  const factors = EmissionLibrary[version as keyof typeof EmissionLibrary] || EMISSION_FACTORS;

  // --- SCOPE 1 CALCULATIONS ---
  const gasEmissions = (inputs.scope1.naturalGasKwh * factors.scope1.naturalGasKwh) / 1000;
  const oilEmissions = (inputs.scope1.burningOilLitres * factors.scope1.burningOilLitre) / 1000;
  const dieselEmissions = (inputs.scope1.dieselLitres * factors.scope1.dieselLitre) / 1000;
  const petrolEmissions = (inputs.scope1.petrolLitres * factors.scope1.petrolLitre) / 1000;

  const companyOwnedKm = convertDistanceToKm(inputs.scope1.companyOwnedKm, inputs.scope1.companyOwnedUnit);
  const companyOwnedEmissions = (companyOwnedKm * factors.scope1.carKm) / 1000;

  const scope1Total = gasEmissions + oilEmissions + dieselEmissions + petrolEmissions + companyOwnedEmissions;

  // --- SCOPE 2 CALCULATIONS ---
  const gridElectricityEmissions = (inputs.scope2.gridElectricityKwh * factors.scope2.electricityGridKwh) / 1000;
  const scope2Total = gridElectricityEmissions;

  // --- SCOPE 3 CALCULATIONS (PPN 06/21 Mandatory Categories) ---

  // Category 4: Upstream Transportation & Distribution
  const cat4HgvKm = inputs.scope3Cat4.hgvTonneKm * factors.scope3.cat4.hgvTonneKm;
  const cat4VanKmConverted = convertDistanceToKm(inputs.scope3Cat4.vanKm, inputs.scope3Cat4.vanUnit);
  const cat4VanEmissions = cat4VanKmConverted * factors.scope3.cat4.vanKm;
  const cat4Total = (cat4HgvKm + cat4VanEmissions) / 1000 + inputs.scope3Cat4.flatTCO2e;

  // Category 5: Operational Waste
  const wasteLandfill = inputs.scope3Cat5.landfillTonnes * factors.scope3.cat5.landfillTonne;
  const wasteCombusted = inputs.scope3Cat5.combustedTonnes * factors.scope3.cat5.combustedTonne;
  const wasteRecycled = inputs.scope3Cat5.recycledTonnes * factors.scope3.cat5.recycledTonne;
  const wasteComposted = inputs.scope3Cat5.compostedTonnes * factors.scope3.cat5.compostedTonne;
  const cat5Total = (wasteLandfill + wasteCombusted + wasteRecycled + wasteComposted) / 1000;

  // Category 6: Business Travel
  const domesticFlightEmissions = inputs.scope3Cat6.domesticFlightPkm * factors.scope3.cat6.domesticFlightPkm;
  const shortHaulFlightEmissions = inputs.scope3Cat6.shortHaulFlightPkm * factors.scope3.cat6.shortHaulFlightPkm;
  const longHaulFlightEmissions = inputs.scope3Cat6.longHaulFlightPkm * factors.scope3.cat6.longHaulFlightPkm;
  const railEmissions = inputs.scope3Cat6.railPkm * factors.scope3.cat6.railPkm;
  const businessCarKmConverted = convertDistanceToKm(inputs.scope3Cat6.carKm, inputs.scope3Cat6.carUnit);
  const businessCarEmissions = businessCarKmConverted * factors.scope3.cat6.carKm;
  const busEmissions = inputs.scope3Cat6.busPkm * factors.scope3.cat6.busPkm;
  const cat6Total = (domesticFlightEmissions + shortHaulFlightEmissions + longHaulFlightEmissions + railEmissions + businessCarEmissions + busEmissions) / 1000;

  // Category 7: Employee Commuting
  const commuteCarKmConverted = convertDistanceToKm(inputs.scope3Cat7.commuteCarKm, inputs.scope3Cat7.commuteCarUnit);
  const commuteCarEmissions = commuteCarKmConverted * factors.scope3.cat7.commuteCarKm;
  const commuteRailEmissions = inputs.scope3Cat7.commuteRailKm * factors.scope3.cat7.commuteRailPkm;
  const commuteBusEmissions = inputs.scope3Cat7.commuteBusKm * factors.scope3.cat7.commuteBusPkm;
  const commuteWfhEmissions = inputs.scope3Cat7.wfhDays * factors.scope3.cat7.wfhDay;
  const cat7Total = (commuteCarEmissions + commuteRailEmissions + commuteBusEmissions + commuteWfhEmissions) / 1000;

  // Category 9: Downstream Transportation & Distribution
  const cat9HgvKm = inputs.scope3Cat9.hgvTonneKm * factors.scope3.cat9.hgvTonneKm;
  const cat9VanKmConverted = convertDistanceToKm(inputs.scope3Cat9.vanKm, inputs.scope3Cat9.vanUnit);
  const cat9VanEmissions = cat9VanKmConverted * factors.scope3.cat9.vanKm;
  const cat9Total = (cat9HgvKm + cat9VanEmissions) / 1000 + inputs.scope3Cat9.flatTCO2e;

  const scope3Total = cat4Total + cat5Total + cat6Total + cat7Total + cat9Total;

  return {
    scope1: {
      naturalGas: Number(gasEmissions.toFixed(3)),
      burningOil: Number(oilEmissions.toFixed(3)),
      diesel: Number(dieselEmissions.toFixed(3)),
      petrol: Number(petrolEmissions.toFixed(3)),
      companyOwned: Number(companyOwnedEmissions.toFixed(3)),
      total: Number(scope1Total.toFixed(3)),
    },
    scope2: {
      gridElectricity: Number(gridElectricityEmissions.toFixed(3)),
      total: Number(scope2Total.toFixed(3)),
    },
    scope3: {
      cat4UpstreamTrans: Number(cat4Total.toFixed(3)),
      cat5OperationalWaste: Number(cat5Total.toFixed(3)),
      cat6BusinessTravel: Number(cat6Total.toFixed(3)),
      cat7EmployeeCommuting: Number(cat7Total.toFixed(3)),
      cat9DownstreamTrans: Number(cat9Total.toFixed(3)),
      total: Number(scope3Total.toFixed(3)),
    },
    grandTotal: Number((scope1Total + scope2Total + scope3Total).toFixed(3)),
  };
}

/**
 * Default state helper to supply initial state for the Wizard application.
 */
export function getInitialWizardInputs(): CarbonWizardInputs {
  return {
    organizationName: '',
    baselineYear: '2022',
    reportingYear: '2025',
    netZeroTargetYear: 2050,
    commitmentStatement: 'Commitment to achieving Net Zero greenhouse gas emissions by 2050 at the latest.',
    employeeHeadcount: 50,
    scope1: {
      naturalGasKwh: 0,
      burningOilLitres: 0,
      dieselLitres: 0,
      petrolLitres: 0,
      companyOwnedKm: 0,
      companyOwnedUnit: 'miles',
    },
    scope2: {
      gridElectricityKwh: 0,
      greenTariffPercentage: 0,
    },
    scope3Cat4: {
      hgvTonneKm: 0,
      vanKm: 0,
      vanUnit: 'miles',
      flatTCO2e: 0,
      methodologyBasis: '',
    },
    scope3Cat5: {
      landfillTonnes: 0,
      combustedTonnes: 0,
      recycledTonnes: 0,
      compostedTonnes: 0,
      methodologyBasis: '',
    },
    scope3Cat6: {
      domesticFlightPkm: 0,
      shortHaulFlightPkm: 0,
      longHaulFlightPkm: 0,
      railPkm: 0,
      carKm: 0,
      carUnit: 'miles',
      busPkm: 0,
      methodologyBasis: '',
    },
    scope3Cat7: {
      commuteCarKm: 0,
      commuteCarUnit: 'miles',
      commuteRailKm: 0,
      commuteBusKm: 0,
      wfhDays: 0,
      methodologyBasis: '',
    },
    scope3Cat9: {
      hgvTonneKm: 0,
      vanKm: 0,
      vanUnit: 'miles',
      flatTCO2e: 0,
      methodologyBasis: '',
    },
    plannedReductions: '',
  };
}

/**
 * High-quality sample baseline data generator.
 * Gives realistic, cohesive data points for standard enterprise benchmarks.
 */
export function generateSampleBaseline(reportingInputs: CarbonWizardInputs): CarbonWizardInputs {
  const ratio = 1.25; // baseline generally higher than reporting
  return {
    ...reportingInputs,
    reportingYear: reportingInputs.baselineYear,
    scope1: {
      naturalGasKwh: Math.round(reportingInputs.scope1.naturalGasKwh * ratio) || 45000,
      burningOilLitres: Math.round(reportingInputs.scope1.burningOilLitres * ratio) || 1200,
      dieselLitres: Math.round(reportingInputs.scope1.dieselLitres * ratio) || 3500,
      petrolLitres: Math.round(reportingInputs.scope1.petrolLitres * ratio) || 800,
      companyOwnedKm: Math.round(reportingInputs.scope1.companyOwnedKm * ratio) || 15000,
      companyOwnedUnit: reportingInputs.scope1.companyOwnedUnit,
    },
    scope2: {
      gridElectricityKwh: Math.round(reportingInputs.scope2.gridElectricityKwh * ratio) || 68000,
      greenTariffPercentage: 0,
    },
    scope3Cat4: {
      hgvTonneKm: Math.round(reportingInputs.scope3Cat4.hgvTonneKm * ratio) || 12000,
      vanKm: Math.round(reportingInputs.scope3Cat4.vanKm * ratio) || 8000,
      vanUnit: reportingInputs.scope3Cat4.vanUnit,
      flatTCO2e: Math.round(reportingInputs.scope3Cat4.flatTCO2e * ratio) || 2,
    },
    scope3Cat5: {
      landfillTonnes: Math.round(reportingInputs.scope3Cat5.landfillTonnes * ratio) || 12,
      combustedTonnes: Math.round(reportingInputs.scope3Cat5.combustedTonnes * ratio) || 4,
      recycledTonnes: Math.round(reportingInputs.scope3Cat5.recycledTonnes * ratio) || 10,
      compostedTonnes: Math.round(reportingInputs.scope3Cat5.compostedTonnes * ratio) || 2,
    },
    scope3Cat6: {
      domesticFlightPkm: Math.round(reportingInputs.scope3Cat6.domesticFlightPkm * ratio) || 15000,
      shortHaulFlightPkm: Math.round(reportingInputs.scope3Cat6.shortHaulFlightPkm * ratio) || 32000,
      longHaulFlightPkm: Math.round(reportingInputs.scope3Cat6.longHaulFlightPkm * ratio) || 85000,
      railPkm: Math.round(reportingInputs.scope3Cat6.railPkm * ratio) || 42000,
      carKm: Math.round(reportingInputs.scope3Cat6.carKm * ratio) || 18000,
      carUnit: reportingInputs.scope3Cat6.carUnit,
      busPkm: Math.round(reportingInputs.scope3Cat6.busPkm * ratio) || 5000,
    },
    scope3Cat7: {
      commuteCarKm: Math.round(reportingInputs.scope3Cat7.commuteCarKm * ratio) || 28000,
      commuteCarUnit: reportingInputs.scope3Cat7.commuteCarUnit,
      commuteRailKm: Math.round(reportingInputs.scope3Cat7.commuteRailKm * ratio) || 65000,
      commuteBusKm: Math.round(reportingInputs.scope3Cat7.commuteBusKm * ratio) || 12000,
      wfhDays: Math.round(reportingInputs.scope3Cat7.wfhDays * 0.8) || 150, // WFH typically higher in reporting year (COVID shift)
    },
    scope3Cat9: {
      hgvTonneKm: Math.round(reportingInputs.scope3Cat9.hgvTonneKm * ratio) || 15000,
      vanKm: Math.round(reportingInputs.scope3Cat9.vanKm * ratio) || 11000,
      vanUnit: reportingInputs.scope3Cat9.vanUnit,
      flatTCO2e: Math.round(reportingInputs.scope3Cat9.flatTCO2e * ratio) || 3,
    },
  };
}

export function getEffectiveScope3Methodology(
  inputs: CarbonWizardInputs,
  category: 'cat4' | 'cat5' | 'cat6' | 'cat7' | 'cat9',
  useWasteBenchmark: boolean = false,
  useCommutingBenchmark: boolean = false
): string {
  switch (category) {
    case 'cat4':
      if (inputs.scope3Cat4.methodologyBasis?.trim()) {
        return inputs.scope3Cat4.methodologyBasis;
      }
      return `Standard distance-based method using 2026 DESNZ factors for HGV (0.10478 kg/t-km) and Van (0.23512 kg/km). Parameters: ${inputs.scope3Cat4.hgvTonneKm} t-km HGV, ${inputs.scope3Cat4.vanKm} ${inputs.scope3Cat4.vanUnit} Van, Override: ${inputs.scope3Cat4.flatTCO2e} tCO2e.`;
    case 'cat5':
      if (inputs.scope3Cat5.methodologyBasis?.trim()) {
        return inputs.scope3Cat5.methodologyBasis;
      }
      if (useWasteBenchmark) {
        return `UK Average Benchmarking: Estimated 0.2 tonnes of operational waste per employee per year for ${inputs.employeeHeadcount} employees (allocated 50% landfill, 50% recycling).`;
      }
      return `Waste tonnage method using 2026 factors: Landfill ${inputs.scope3Cat5.landfillTonnes}t, Combusted ${inputs.scope3Cat5.combustedTonnes}t, Recycled ${inputs.scope3Cat5.recycledTonnes}t, Composted ${inputs.scope3Cat5.compostedTonnes}t.`;
    case 'cat6':
      if (inputs.scope3Cat6.methodologyBasis?.trim()) {
        return inputs.scope3Cat6.methodologyBasis;
      }
      return `Passenger-kilometer (pkm) calculation using 2026 factors. Parameters: Rail: ${inputs.scope3Cat6.railPkm} pkm, Domestic flights: ${inputs.scope3Cat6.domesticFlightPkm} pkm, Short-haul: ${inputs.scope3Cat6.shortHaulFlightPkm} pkm, Long-haul: ${inputs.scope3Cat6.longHaulFlightPkm} pkm, Car: ${inputs.scope3Cat6.carKm} ${inputs.scope3Cat6.carUnit}, Bus: ${inputs.scope3Cat6.busPkm} pkm.`;
    case 'cat7':
      if (inputs.scope3Cat7.methodologyBasis?.trim()) {
        return inputs.scope3Cat7.methodologyBasis;
      }
      if (useCommutingBenchmark) {
        return `UK DfT Commuting Benchmarking: Estimated travel distance (1,007 miles/employee/year) for ${inputs.employeeHeadcount} employees plus standard WFH teleworking energy allowance (0.34 kg CO2e/day) for telecommuters.`;
      }
      return `Commuter vehicle mileage + teleworking allowance method. Parameters: Road: ${inputs.scope3Cat7.commuteCarKm} ${inputs.scope3Cat7.commuteCarUnit}, Rail: ${inputs.scope3Cat7.commuteRailKm} km, Bus: ${inputs.scope3Cat7.commuteBusKm} km. WFH: ${inputs.scope3Cat7.wfhDays} remote days.`;
    case 'cat9':
      if (inputs.scope3Cat9.methodologyBasis?.trim()) {
        return inputs.scope3Cat9.methodologyBasis;
      }
      return `Standard distance-based downstream logistics method using 2026 DESNZ factors. Parameters: ${inputs.scope3Cat9.hgvTonneKm} t-km HGV, ${inputs.scope3Cat9.vanKm} ${inputs.scope3Cat9.vanUnit} Van, Override: ${inputs.scope3Cat9.flatTCO2e} tCO2e.`;
    default:
      return '';
  }
}

