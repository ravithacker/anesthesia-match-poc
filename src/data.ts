import jobsData from "../data/jobs.json";
import providersData from "../data/providers.json";
import profilesData from "../data/profiles.json";
import jdData from "../data/jd.json";
import matchesData from "./data/matches.json";
import eligibilityData from "./data/eligibility.json";
import type { AiMatch, EligibilityCheck, Job, JobDescription, Label, MatchesFile, PairEligibility, Profile, Provider } from "./lib/types";

export const jobs = jobsData as Job[];
export const providers = providersData as Provider[];
export const profiles = profilesData as Profile[];
export const jds = jdData as JobDescription[];
const m = matchesData as MatchesFile;
export const eligibility = eligibilityData as PairEligibility[];

export const STRONG = 70;
export const key = (p: string, j: string) => `${p}|${j}`;
export const pById = new Map(providers.map((p) => [p.id, p]));
export const jById = new Map(jobs.map((j) => [j.id, j]));
export const profById = new Map(profiles.map((p) => [p.providerId, p]));
export const jdById = new Map(jds.map((d) => [d.jobId, d]));
export const aiByPair = new Map<string, AiMatch>(m.matches.map((x) => [key(x.providerId, x.jobId), x]));
export const eligByPair = new Map(eligibility.map((e) => [key(e.providerId, e.jobId), e]));
// Evaluation only covers pairs that are eligible under the verified record.
export const labels: Label[] = m.labels.filter((l) => eligByPair.get(key(l.providerId, l.jobId))?.eligible);
export const generatedAt = m.generatedAt;

export const money = (j: Job) =>
  j.payAnnual ? `$${(j.payAnnual[0] / 1000).toFixed(0)}K–$${(j.payAnnual[1] / 1000).toFixed(0)}K` : `$${j.payHourly![0]}–$${j.payHourly![1]}/hr`;

export const CRED_RULES = ["State licence", "DEA registration", "Board certification", "Exclusion screening"];

export type CredState = "ok" | "warn" | "fail" | "na";
export function credSummary(checks: EligibilityCheck[]) {
  const out: Record<string, CredState> = {};
  for (const r of CRED_RULES) {
    const c = checks.find((x) => x.rule === r);
    out[r] = !c ? "na" : !c.pass ? "fail" : c.warn ? "warn" : "ok";
  }
  return out;
}

/** Provider-level credential health, independent of any job. */
export function providerHealth(id: string): { state: "clear" | "attention" | "blocked"; issues: string[] } {
  const v = profById.get(id)!.verification;
  const issues: string[] = [];
  let blocked = false;
  for (const l of v.licences) {
    if (l.status !== "Active") { issues.push(`${l.state} licence ${l.status.toLowerCase()} (profile says active)`); blocked = true; }
    else if (l.expires < "2027-04-30") issues.push(`${l.state} licence expires ${l.expires}`);
  }
  for (const d of v.dea) if (d.status !== "Active") { issues.push(`${d.state} DEA expired ${d.expires}`); blocked = true; }
  if (v.board.status === "Lapsed") { issues.push(`${v.board.body} certification lapsed ${v.board.validThrough}`); blocked = true; }
  for (const e of v.exclusions) if (e.result !== "Clear") { issues.push(`${e.list}: possible match, in review`); blocked = true; }
  return { state: blocked ? "blocked" : issues.length ? "attention" : "clear", issues };
}

export const initials = (name: string) => name.split(" ").map((s) => s[0]).join("").slice(0, 2);
const GRADS = [
  ["#0f766e", "#14b8a6"], ["#1d4ed8", "#60a5fa"], ["#7c3aed", "#a78bfa"], ["#b45309", "#f59e0b"],
  ["#be185d", "#f472b6"], ["#0369a1", "#38bdf8"], ["#4d7c0f", "#a3e635"], ["#9f1239", "#fb7185"],
];
export const grad = (id: string) => {
  const g = GRADS[parseInt(id.replace(/\D/g, ""), 10) % GRADS.length];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
};
export const fmtDate = (iso: string) =>
  new Date(iso.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
