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
}

export interface Scope3Category5Inputs {
  landfillTonnes: number;
  combustedTonnes: number;
  recycledTonnes: number;
  compostedTonnes: number;
}

export interface Scope3Category6Inputs {
  domesticFlightPkm: number; // Passenger-km
  shortHaulFlightPkm: number;
  longHaulFlightPkm: number;
  railPkm: number;
  carKm: number;
  carUnit: 'km' | 'miles';
  busPkm: number;
}

export interface Scope3Category7Inputs {
  commuteCarKm: number;
  commuteCarUnit: 'km' | 'miles';
  commuteRailKm: number;
  commuteBusKm: number;
  wfhDays: number; // Work from home days (for teleworking emissions)
}

export interface Scope3Category9Inputs {
  hgvTonneKm: number;
  vanKm: number;
  vanUnit: 'km' | 'miles';
  flatTCO2e: number;
}

export interface CarbonWizardInputs {
  organizationName: string;
  baselineYear: string;
  reportingYear: string;
  netZeroTargetYear: number;
  commitmentStatement: string;
  scope1: Scope1Inputs;
  scope2: Scope2Inputs;
  scope3Cat4: Scope3Category4Inputs;
  scope3Cat5: Scope3Category5Inputs;
  scope3Cat6: Scope3Category6Inputs;
  scope3Cat7: Scope3Category7Inputs;
  scope3Cat9: Scope3Category9Inputs;
  plannedReductions: string;
}

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

// UK Government Conversion Factors (kg CO2e per unit)
export const EMISSION_FACTORS = {
  scope1: {
    naturalGasKwh: 0.18293,       // kg CO2e per kWh
    burningOilLitre: 2.54012,     // kg CO2e per litre
    dieselLitre: 2.51233,         // kg CO2e per litre
    petrolLitre: 2.16244,         // kg CO2e per litre
    carKm: 0.16492,               // kg CO2e per km (Average local passenger car)
  },
  scope2: {
    electricityGridKwh: 0.20706,  // kg CO2e per kWh (UK grid electricity)
  },
  scope3: {
    cat4: {
      hgvTonneKm: 0.10478,        // kg CO2e per tonne-km
      vanKm: 0.23512,             // kg CO2e per km
    },
    cat5: {
      landfillTonne: 439.52,      // kg CO2e per tonne of municipal waste to landfill
      combustedTonne: 21.84,      // kg CO2e per tonne of municipal waste combusted
      recycledTonne: 21.28,       // kg CO2e per tonne of recycled waste
      compostedTonne: 5.82,       // kg CO2e per tonne of composted organic waste
    },
    cat6: {
      domesticFlightPkm: 0.24455,  // kg CO2e per passenger-km (UK domestic)
      shortHaulFlightPkm: 0.15124, // kg CO2e per passenger-km (Short-haul international, European)
      longHaulFlightPkm: 0.19310,  // kg CO2e per passenger-km (Long-haul international)
      railPkm: 0.03549,            // kg CO2e per passenger-km (National Rail)
      carKm: 0.16492,              // kg CO2e per km (Average passenger car)
      busPkm: 0.09612,             // kg CO2e per passenger-km (Local bus / coach)
    },
    cat7: {
      commuteCarKm: 0.16492,       // kg CO2e per km
      commuteRailPkm: 0.03549,     // kg CO2e per passenger-km
      commuteBusPkm: 0.09612,      // kg CO2e per passenger-km
      wfhDay: 0.34,                // kg CO2e per day (teleworking home energy allowance)
    },
    cat9: {
      hgvTonneKm: 0.10478,        // kg CO2e per tonne-km
      vanKm: 0.23512,             // kg CO2e per km
    },
  },
};

const MILES_TO_KM = 1.609344;

function convertDistanceToKm(value: number, unit: 'km' | 'miles'): number {
  return unit === 'miles' ? value * MILES_TO_KM : value;
}

/**
 * Calculates emissions based on UK Gov GHG Conversion Factors.
 * Returns emissions in metric Tonnes of CO2e (tCO2e) which is the required unit for PPN 06/21.
 */
export function calculateEmissions(inputs: CarbonWizardInputs): EmissionsBreakdown {
  // --- SCOPE 1 CALCULATIONS ---
  const gasEmissions = (inputs.scope1.naturalGasKwh * EMISSION_FACTORS.scope1.naturalGasKwh) / 1000;
  const oilEmissions = (inputs.scope1.burningOilLitres * EMISSION_FACTORS.scope1.burningOilLitre) / 1000;
  const dieselEmissions = (inputs.scope1.dieselLitres * EMISSION_FACTORS.scope1.dieselLitre) / 1000;
  const petrolEmissions = (inputs.scope1.petrolLitres * EMISSION_FACTORS.scope1.petrolLitre) / 1000;

  const companyOwnedKm = convertDistanceToKm(inputs.scope1.companyOwnedKm, inputs.scope1.companyOwnedUnit);
  const companyOwnedEmissions = (companyOwnedKm * EMISSION_FACTORS.scope1.carKm) / 1000;

  const scope1Total = gasEmissions + oilEmissions + dieselEmissions + petrolEmissions + companyOwnedEmissions;

  // --- SCOPE 2 CALCULATIONS ---
  const gridElectricityEmissions = (inputs.scope2.gridElectricityKwh * EMISSION_FACTORS.scope2.electricityGridKwh) / 1000;
  const scope2Total = gridElectricityEmissions;

  // --- SCOPE 3 CALCULATIONS (PPN 06/21 Mandatory Categories) ---

  // Category 4: Upstream Transportation & Distribution
  const cat4HgvKm = inputs.scope3Cat4.hgvTonneKm * EMISSION_FACTORS.scope3.cat4.hgvTonneKm;
  const cat4VanKmConverted = convertDistanceToKm(inputs.scope3Cat4.vanKm, inputs.scope3Cat4.vanUnit);
  const cat4VanEmissions = cat4VanKmConverted * EMISSION_FACTORS.scope3.cat4.vanKm;
  const cat4Total = (cat4HgvKm + cat4VanEmissions) / 1000 + inputs.scope3Cat4.flatTCO2e;

  // Category 5: Operational Waste
  const wasteLandfill = inputs.scope3Cat5.landfillTonnes * EMISSION_FACTORS.scope3.cat5.landfillTonne;
  const wasteCombusted = inputs.scope3Cat5.combustedTonnes * EMISSION_FACTORS.scope3.cat5.combustedTonne;
  const wasteRecycled = inputs.scope3Cat5.recycledTonnes * EMISSION_FACTORS.scope3.cat5.recycledTonne;
  const wasteComposted = inputs.scope3Cat5.compostedTonnes * EMISSION_FACTORS.scope3.cat5.compostedTonne;
  const cat5Total = (wasteLandfill + wasteCombusted + wasteRecycled + wasteComposted) / 1000;

  // Category 6: Business Travel
  const domesticFlightEmissions = inputs.scope3Cat6.domesticFlightPkm * EMISSION_FACTORS.scope3.cat6.domesticFlightPkm;
  const shortHaulFlightEmissions = inputs.scope3Cat6.shortHaulFlightPkm * EMISSION_FACTORS.scope3.cat6.shortHaulFlightPkm;
  const longHaulFlightEmissions = inputs.scope3Cat6.longHaulFlightPkm * EMISSION_FACTORS.scope3.cat6.longHaulFlightPkm;
  const railEmissions = inputs.scope3Cat6.railPkm * EMISSION_FACTORS.scope3.cat6.railPkm;
  const businessCarKmConverted = convertDistanceToKm(inputs.scope3Cat6.carKm, inputs.scope3Cat6.carUnit);
  const businessCarEmissions = businessCarKmConverted * EMISSION_FACTORS.scope3.cat6.carKm;
  const busEmissions = inputs.scope3Cat6.busPkm * EMISSION_FACTORS.scope3.cat6.busPkm;
  const cat6Total = (domesticFlightEmissions + shortHaulFlightEmissions + longHaulFlightEmissions + railEmissions + businessCarEmissions + busEmissions) / 1000;

  // Category 7: Employee Commuting
  const commuteCarKmConverted = convertDistanceToKm(inputs.scope3Cat7.commuteCarKm, inputs.scope3Cat7.commuteCarUnit);
  const commuteCarEmissions = commuteCarKmConverted * EMISSION_FACTORS.scope3.cat7.commuteCarKm;
  const commuteRailEmissions = inputs.scope3Cat7.commuteRailKm * EMISSION_FACTORS.scope3.cat7.commuteRailPkm;
  const commuteBusEmissions = inputs.scope3Cat7.commuteBusKm * EMISSION_FACTORS.scope3.cat7.commuteBusPkm;
  const commuteWfhEmissions = inputs.scope3Cat7.wfhDays * EMISSION_FACTORS.scope3.cat7.wfhDay;
  const cat7Total = (commuteCarEmissions + commuteRailEmissions + commuteBusEmissions + commuteWfhEmissions) / 1000;

  // Category 9: Downstream Transportation & Distribution
  const cat9HgvKm = inputs.scope3Cat9.hgvTonneKm * EMISSION_FACTORS.scope3.cat9.hgvTonneKm;
  const cat9VanKmConverted = convertDistanceToKm(inputs.scope3Cat9.vanKm, inputs.scope3Cat9.vanUnit);
  const cat9VanEmissions = cat9VanKmConverted * EMISSION_FACTORS.scope3.cat9.vanKm;
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
    },
    scope3Cat5: {
      landfillTonnes: 0,
      combustedTonnes: 0,
      recycledTonnes: 0,
      compostedTonnes: 0,
    },
    scope3Cat6: {
      domesticFlightPkm: 0,
      shortHaulFlightPkm: 0,
      longHaulFlightPkm: 0,
      railPkm: 0,
      carKm: 0,
      carUnit: 'miles',
      busPkm: 0,
    },
    scope3Cat7: {
      commuteCarKm: 0,
      commuteCarUnit: 'miles',
      commuteRailKm: 0,
      commuteBusKm: 0,
      wfhDays: 0,
    },
    scope3Cat9: {
      hgvTonneKm: 0,
      vanKm: 0,
      vanUnit: 'miles',
      flatTCO2e: 0,
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
