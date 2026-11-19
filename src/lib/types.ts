export type Role = "Anesthesiologist" | "CRNA" | "CAA";
export type CaseType = "general" | "cardiac" | "pediatric" | "obstetric" | "regional" | "trauma";
export type Contract = "W2" | "1099" | "Locum";

export interface Provider {
  id: string;
  name: string;
  role: Role;
  yearsExperience: number;
  boardCertified: boolean;
  licenses: string[]; // US state codes with an active licence
  deaStates: string[]; // states with an active DEA registration
  caseExperience: CaseType[];
  availableFrom: string; // ISO date
  credentialingDocsReady: boolean; // CV, references, case logs, malpractice history packaged
  acceptsContracts: Contract[];
  preferredStates: string[];
  openToRelocation: boolean;
  takesCall: boolean;
  minAnnualPay?: number; // W2 expectation
  minHourlyPay?: number; // 1099 / locum expectation
  bio: string;
}

export interface Job {
  id: string;
  title: string;
  facility: string;
  city: string;
  state: string;
  acceptedRoles: Role[];
  careModel: string;
  requiredCases: CaseType[];
  minYears: number;
  requiresBoardCert: boolean;
  requiresDEA: boolean;
  contract: Contract;
  callRequired: boolean;
  payAnnual?: [number, number];
  payHourly?: [number, number];
  startDate: string;
  description: string;
}

export interface EligibilityCheck {
  rule: string;
  pass: boolean;
  detail: string;
}

export interface PairEligibility {
  providerId: string;
  jobId: string;
  eligible: boolean;
  earliestStart: string;
  checks: EligibilityCheck[];
}

export interface AiMatch {
  providerId: string;
  jobId: string;
  score: number;
  recruiterReason: string;
  providerPitch: string;
  concerns: string[];
}

export interface Label {
  providerId: string;
  jobId: string;
  label: "good" | "weak";
  why: string;
}

export interface MatchesFile {
  generatedAt: string;
  model: string;
  eligibility: PairEligibility[];
  matches: AiMatch[];
  labels: Label[];
}
