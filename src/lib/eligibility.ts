import type { EligibilityCheck, Job, PairEligibility, Provider } from "./types";

/**
 * Layer 1: hard eligibility. Deterministic, explainable, runs in the database in production
 * (these map 1:1 to SQL WHERE clauses on indexed columns). A provider who fails any rule
 * is never shown the job, and the recruiter can see exactly which rule failed.
 *
 * NOTE: rule values (credentialing lead times, grace window) are illustrative for the demo.
 * In production they come from a maintained compliance table, per state and per facility.
 */
export const TODAY = "2026-11-19";
const CREDENTIALING_DAYS_DOCS_READY = 30;
const CREDENTIALING_DAYS_DOCS_MISSING = 90;
const START_GRACE_DAYS = 14;

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const maxDate = (a: string, b: string) => (a > b ? a : b);

export function checkPair(p: Provider, j: Job): PairEligibility {
  const checks: EligibilityCheck[] = [];
  const add = (rule: string, pass: boolean, detail: string) => checks.push({ rule, pass, detail });

  add(
    "Role",
    j.acceptedRoles.includes(p.role),
    j.acceptedRoles.includes(p.role) ? `${p.role} accepted` : `Job accepts ${j.acceptedRoles.join(" / ")}, provider is ${p.role}`
  );

  const licensed = p.licenses.includes(j.state);
  add("State licence", licensed, licensed ? `Active ${j.state} licence` : `No ${j.state} licence (holds ${p.licenses.join(", ")})`);

  if (j.requiresDEA) {
    const dea = p.deaStates.includes(j.state);
    add("DEA registration", dea, dea ? `DEA registered in ${j.state}` : `No DEA registration in ${j.state}`);
  }

  if (j.requiresBoardCert) {
    add("Board certification", p.boardCertified, p.boardCertified ? "Board certified" : "Not yet board certified");
  }

  const missingCases = j.requiredCases.filter((c) => !p.caseExperience.includes(c));
  add(
    "Case mix",
    missingCases.length === 0,
    missingCases.length === 0 ? `Has ${j.requiredCases.join(", ")} experience` : `Missing ${missingCases.join(", ")} experience`
  );

  add(
    "Experience",
    p.yearsExperience >= j.minYears,
    `${p.yearsExperience} yrs (job needs ${j.minYears}+)`
  );

  add(
    "Contract type",
    p.acceptsContracts.includes(j.contract),
    p.acceptsContracts.includes(j.contract) ? `Open to ${j.contract}` : `Wants ${p.acceptsContracts.join(" / ")}, job is ${j.contract}`
  );

  const credDays = p.credentialingDocsReady ? CREDENTIALING_DAYS_DOCS_READY : CREDENTIALING_DAYS_DOCS_MISSING;
  const earliestStart = maxDate(p.availableFrom, addDays(TODAY, credDays));
  const onTime = earliestStart <= addDays(j.startDate, START_GRACE_DAYS);
  add(
    "Start date",
    onTime,
    `Earliest start ${earliestStart} (available ${p.availableFrom}, ~${credDays}d credentialing) vs job start ${j.startDate}`
  );

  return { providerId: p.id, jobId: j.id, eligible: checks.every((c) => c.pass), earliestStart, checks };
}
