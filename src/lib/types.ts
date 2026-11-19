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
  warn?: string; // passes, but a recruiter should act (e.g. licence renewal due before start)
  source?: string; // where the fact was verified
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

/* ---------- Verified record, CV and sourcing (added in v2) ---------- */

export type VStatus = "verified" | "warning" | "failed";

export interface LicenceRecord {
  state: string;
  type: string; // e.g. "APRN-CRNA", "Physician (MD)"
  number: string;
  status: "Active" | "Expired" | "Inactive";
  expires: string;
  discipline: string;
  source: string;
  checkedAt: string;
  selfReported: boolean; // did the provider list it on their profile?
}

export interface DeaRecord {
  state: string;
  number: string; // masked
  schedules: string;
  status: "Active" | "Expired";
  expires: string;
  source: string;
  checkedAt: string;
}

export interface Verification {
  npi: string;
  npiStatus: "Active";
  taxonomy: string;
  npiSource: string;
  npiCheckedAt: string;
  licences: LicenceRecord[];
  dea: DeaRecord[];
  board: { body: string; credential: string; status: "Active" | "Lapsed" | "Eligible"; validThrough: string; source: string; checkedAt: string };
  exclusions: { list: string; result: "Clear" | "Possible match"; detail: string; checkedAt: string }[];
}

export interface Profile {
  providerId: string;
  headline: string;
  homeCity: string;
  source: { channel: string; detail: string; date: string };
  journey: { date: string; event: string }[];
  education: { degree: string; school: string; years: string }[];
  experience: { title: string; org: string; location: string; from: string; to: string; bullets: string[] }[];
  caseLog: Partial<Record<CaseType, number>>;
  skills: string[];
  references: string;
  malpractice: string;
  verification: Verification;
}

export interface JobDescription {
  jobId: string;
  postedBy: string;
  postedAt: string;
  about: string;
  responsibilities: string[];
  requirements: { text: string; rule: string; verifiedBy: string }[];
  niceToHave: string[];
  schedule: string;
  benefits: string[];
}
