import type { EligibilityCheck, Job, PairEligibility, Provider, Verification } from "./types";

/**
 * Layer 1: hard eligibility. Deterministic, explainable, runs in the database in production
 * (these map 1:1 to SQL WHERE clauses on indexed columns).
 *
 * Credential rules read the VERIFIED record (state board, DEA, certifying body, exclusion lists),
 * not what the provider typed on their profile. When the two disagree, the verified record wins
 * and the recruiter sees both.
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

export function checkPair(p: Provider, j: Job, v?: Verification): PairEligibility {
  const checks: EligibilityCheck[] = [];
  const add = (c: EligibilityCheck) => checks.push(c);

  add({
    rule: "Role",
    pass: j.acceptedRoles.includes(p.role),
    detail: j.acceptedRoles.includes(p.role) ? `${p.role} accepted` : `Job accepts ${j.acceptedRoles.join(" / ")}, provider is ${p.role}`,
    source: v ? `NPI taxonomy ${v.taxonomy}` : undefined,
  });

  // State licence: verified record first, self-report as fallback (pre-verification).
  const lic = v?.licences.find((l) => l.state === j.state);
  if (v) {
    if (!lic) {
      add({ rule: "State licence", pass: false, detail: `No ${j.state} licence on record (holds ${v.licences.map((l) => l.state).join(", ")})` });
    } else if (lic.status !== "Active") {
      add({
        rule: "State licence",
        pass: false,
        detail: `${j.state} licence ${lic.number} is ${lic.status.toUpperCase()} (expired ${lic.expires})${lic.selfReported ? " although the profile lists it as active" : ""}`,
        source: lic.source,
      });
    } else {
      const renewal = lic.expires < j.startDate;
      add({
        rule: "State licence",
        pass: true,
        detail: `${j.state} ${lic.type} ${lic.number}, active to ${lic.expires}`,
        warn: renewal ? `Expires ${lic.expires}, before the ${j.startDate} start. Renewal needed.` : undefined,
        source: lic.source,
      });
    }
  } else {
    const licensed = p.licenses.includes(j.state);
    add({ rule: "State licence", pass: licensed, detail: licensed ? `${j.state} licence (self-reported)` : `No ${j.state} licence (holds ${p.licenses.join(", ")})` });
  }

  if (j.requiresDEA) {
    const dea = v?.dea.find((d) => d.state === j.state);
    if (v) {
      const ok = !!dea && dea.status === "Active";
      add({
        rule: "DEA registration",
        pass: ok,
        detail: !dea ? `No DEA registration for ${j.state}` : ok ? `${j.state} DEA ${dea.number}, schedules ${dea.schedules}, to ${dea.expires}` : `${j.state} DEA ${dea.number} EXPIRED ${dea.expires}`,
        source: dea?.source,
      });
    } else {
      const has = p.deaStates.includes(j.state);
      add({ rule: "DEA registration", pass: has, detail: has ? `DEA in ${j.state} (self-reported)` : `No DEA registration in ${j.state}` });
    }
  }

  if (j.requiresBoardCert) {
    const ok = v ? v.board.status === "Active" : p.boardCertified;
    add({
      rule: "Board certification",
      pass: ok,
      detail: v ? `${v.board.credential}: ${v.board.status}${v.board.status === "Active" ? `, valid through ${v.board.validThrough}` : ""}` : ok ? "Board certified" : "Not yet board certified",
      source: v?.board.source,
    });
  }

  if (v) {
    const hit = v.exclusions.find((e) => e.result !== "Clear");
    add({
      rule: "Exclusion screening",
      pass: !hit,
      detail: hit ? `${hit.list}: ${hit.detail}` : `Clear on ${v.exclusions.map((e) => e.list).join(", ")}`,
      source: v.exclusions.map((e) => e.list).join(" · "),
    });
  }

  const missingCases = j.requiredCases.filter((c) => !p.caseExperience.includes(c));
  add({
    rule: "Case mix",
    pass: missingCases.length === 0,
    detail: missingCases.length === 0 ? `Has ${j.requiredCases.join(", ")} experience` : `Missing ${missingCases.join(", ")} experience`,
    source: "Case log on CV",
  });

  add({ rule: "Experience", pass: p.yearsExperience >= j.minYears, detail: `${p.yearsExperience} yrs (job needs ${j.minYears}+)`, source: "Work history" });

  add({
    rule: "Contract type",
    pass: p.acceptsContracts.includes(j.contract),
    detail: p.acceptsContracts.includes(j.contract) ? `Open to ${j.contract}` : `Wants ${p.acceptsContracts.join(" / ")}, job is ${j.contract}`,
    source: "Provider preferences",
  });

  const credDays = p.credentialingDocsReady ? CREDENTIALING_DAYS_DOCS_READY : CREDENTIALING_DAYS_DOCS_MISSING;
  const earliestStart = maxDate(p.availableFrom, addDays(TODAY, credDays));
  const onTime = earliestStart <= addDays(j.startDate, START_GRACE_DAYS);
  add({
    rule: "Start date",
    pass: onTime,
    detail: `Earliest start ${earliestStart} (available ${p.availableFrom}, ~${credDays}d credentialing) vs job start ${j.startDate}`,
    source: p.credentialingDocsReady ? "Credentialing packet complete" : "Credentialing packet incomplete",
  });

  return { providerId: p.id, jobId: j.id, eligible: checks.every((c) => c.pass), earliestStart, checks };
}
