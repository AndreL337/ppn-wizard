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

// Safe require for factors/hash.json to support local dev where it might be absent
let factorsHash: { hash: string } | null = null;
try {
  // Use CommonJS require to avoid static import compilation errors when file is absent
  const req = typeof require !== 'undefined' ? require : undefined;
  if (req) {
    factorsHash = req('./factors/hash.json');
  }
} catch (e) {
  console.warn('factors/hash.json is not present. Integrity check will fall back to runtime computation.');
}

// Canonical JSON deep-sort stringification to guarantee whitespace/format immunity
function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const properties = keys.map(key => {
    return JSON.stringify(key) + ':' + canonicalStringify(obj[key]);
  });
  return '{' + properties.join(',') + '}';
}

function sha256Sync(str: string): string {
  const hexcase = 0;
  function safe_add(x: number, y: number) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function S(X: number, n: number) { return (X >>> n) | (X << (32 - n)); }
  function R(X: number, n: number) { return (X >>> n); }
  function Ch(x: number, y: number, z: number) { return ((x & y) ^ ((~x) & z)); }
  function Maj(x: number, y: number, z: number) { return ((x & y) ^ (x & z) ^ (y & z)); }
  function Sigma0256(x: number) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
  function Sigma1256(x: number) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
  function gamma0256(x: number) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
  function gamma1256(x: number) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }
  function core_sha256(m: number[], l: number) {
    const K = [
      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const HASH = [
      0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
    ];
    const W = new Array(64);
    let a, b, c, d, e, f, g, h;
    let T1, T2;
    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >> 9) << 4) + 15] = l;
    for (let i = 0; i < m.length; i += 16) {
      a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
      for (let j = 0; j < 64; j++) {
        if (j < 16) W[j] = m[i + j];
        else W[j] = safe_add(safe_add(safe_add(gamma1256(W[j - 2]), W[j - 7]), gamma0256(W[j - 15])), W[j - 16]);
        T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
        T2 = safe_add(Sigma0256(a), Maj(a, b, c));
        h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
      }
      HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]);
      HASH[3] = safe_add(d, HASH[3]); HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]);
      HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
    }
    return HASH;
  }
  function bytes2binb(bytes: Uint8Array) {
    const bin: number[] = [];
    for (let i = 0; i < bytes.length * 8; i += 8) {
      const idx = i >> 5;
      const byteValue = bytes[i / 8];
      bin[idx] = (bin[idx] || 0) | (byteValue << (24 - i % 32));
    }
    return bin;
  }
  function binb2hex(binarray: number[]) {
    const hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
             hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
    }
    return str;
  }
  const bytes = new TextEncoder().encode(str);
  return binb2hex(core_sha256(bytes2binb(bytes), bytes.length * 8));
}

function verifyFactorsIntegrity() {
  try {
    const canonicalContent = canonicalStringify(factors2026);
    const computedHash = sha256Sync(canonicalContent);
    if (factorsHash && computedHash !== factorsHash.hash) {
      console.warn(`WARNING: Integrity mismatch between factors and build hash. Computed: ${computedHash}, Pinned: ${factorsHash.hash}`);
    } else if (!factorsHash) {
      console.info('factors/hash.json is absent. Pinned hash integrity check skipped.');
    }
  } catch (err) {
    console.error('Error verifying factors integrity:', err);
  }
}

// Runtime Self-Check
verifyFactorsIntegrity();

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
        return `${inputs.scope3Cat4.methodologyBasis.trim()} (supplier-provided note)`;
      }
      return `Standard distance-based method using 2026 DESNZ factors for HGV (0.10478 kg/t-km) and Van (0.23512 kg/km). Parameters: ${inputs.scope3Cat4.hgvTonneKm} t-km HGV, ${inputs.scope3Cat4.vanKm} ${inputs.scope3Cat4.vanUnit} Van, Override: ${inputs.scope3Cat4.flatTCO2e} tCO2e.`;
    case 'cat5':
      if (inputs.scope3Cat5.methodologyBasis?.trim()) {
        return `${inputs.scope3Cat5.methodologyBasis.trim()} (supplier-provided note)`;
      }
      if (useWasteBenchmark) {
        return `Estimated using general industry factor (0.2t per employee per year; 50/50 landfill/recycling split). This is an estimate; consider conducting a waste-audit for higher accuracy.`;
      }
      return `Waste tonnage method using 2026 factors: Landfill ${inputs.scope3Cat5.landfillTonnes}t, Combusted ${inputs.scope3Cat5.combustedTonnes}t, Recycled ${inputs.scope3Cat5.recycledTonnes}t, Composted ${inputs.scope3Cat5.compostedTonnes}t.`;
    case 'cat6':
      if (inputs.scope3Cat6.methodologyBasis?.trim()) {
        return `${inputs.scope3Cat6.methodologyBasis.trim()} (supplier-provided note)`;
      }
      return `Passenger-kilometer (pkm) calculation using 2026 factors. Parameters: Rail: ${inputs.scope3Cat6.railPkm} pkm, Domestic flights: ${inputs.scope3Cat6.domesticFlightPkm} pkm, Short-haul: ${inputs.scope3Cat6.shortHaulFlightPkm} pkm, Long-haul: ${inputs.scope3Cat6.longHaulFlightPkm} pkm, Car: ${inputs.scope3Cat6.carKm} ${inputs.scope3Cat6.carUnit}, Bus: ${inputs.scope3Cat6.busPkm} pkm.`;
    case 'cat7':
      if (inputs.scope3Cat7.methodologyBasis?.trim()) {
        return `${inputs.scope3Cat7.methodologyBasis.trim()} (supplier-provided note)`;
      }
      if (useCommutingBenchmark) {
        return `Estimated utilizing the UK Department for Transport (DfT) National Travel Survey average commute distance of approximately 631 miles per employee per year (Table NTS0409, basis: average commuting mileage per year per regular private vehicle driver).`;
      }
      return `Commuter vehicle mileage + teleworking allowance method. Parameters: Road: ${inputs.scope3Cat7.commuteCarKm} ${inputs.scope3Cat7.commuteCarUnit}, Rail: ${inputs.scope3Cat7.commuteRailKm} km, Bus: ${inputs.scope3Cat7.commuteBusKm} km. WFH: ${inputs.scope3Cat7.wfhDays} remote days.`;
    case 'cat9':
      if (inputs.scope3Cat9.methodologyBasis?.trim()) {
        return `${inputs.scope3Cat9.methodologyBasis.trim()} (supplier-provided note)`;
      }
      return `Standard distance-based downstream logistics method using 2026 DESNZ factors. Parameters: ${inputs.scope3Cat9.hgvTonneKm} t-km HGV, ${inputs.scope3Cat9.vanKm} ${inputs.scope3Cat9.vanUnit} Van, Override: ${inputs.scope3Cat9.flatTCO2e} tCO2e.`;
    default:
      return '';
  }
}

