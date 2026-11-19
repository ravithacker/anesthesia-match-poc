/**
 * Adds what a recruiter actually needs on top of the base profiles:
 *   - verification records (NPI, state licence, DEA, board certification, exclusion lists), each with
 *     its source and the time it was checked
 *   - a CV (education, work history, case log, skills)
 *   - where the candidate came from, and their journey to this shortlist
 *   - the full job description for every role, with each requirement mapped to the rule it became
 * Then re-runs eligibility against the VERIFIED record -> src/data/eligibility.json
 *
 * All people, numbers and facilities are fictional. Source names are the real bodies a production
 * system would query; the results here are simulated.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { checkPair, TODAY } from "../src/lib/eligibility";
import type { CaseType, Job, JobDescription, Profile, Provider, Verification } from "../src/lib/types";

let seed = 777;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const digits = (n: number) => Array.from({ length: n }, () => int(0, 9)).join("");
const addDays = (iso: string, d: number) => { const x = new Date(iso + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const stamp = (daysAgo: number) => `${addDays(TODAY, -daysAgo)} ${String(int(7, 18)).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")} UTC`;

const jobs: Job[] = JSON.parse(readFileSync("data/jobs.json", "utf8"));
const providers: Provider[] = JSON.parse(readFileSync("data/providers.json", "utf8"));

const STATE_NAME: Record<string, string> = {
  GA: "Georgia", IL: "Illinois", AZ: "Arizona", FL: "Florida", MT: "Montana", WA: "Washington", OH: "Ohio", TX: "Texas",
  CA: "California", NY: "New York", CO: "Colorado", NC: "North Carolina", SC: "South Carolina", WI: "Wisconsin", NV: "Nevada",
  AL: "Alabama", ID: "Idaho", OR: "Oregon", PA: "Pennsylvania", OK: "Oklahoma",
};
const CITY: Record<string, string[]> = {
  GA: ["Atlanta", "Savannah", "Macon"], IL: ["Chicago", "Peoria", "Naperville"], AZ: ["Phoenix", "Tucson", "Mesa"], FL: ["Tampa", "Orlando", "Jacksonville"],
  MT: ["Billings", "Missoula", "Bozeman"], WA: ["Seattle", "Spokane", "Tacoma"], OH: ["Columbus", "Cleveland", "Dayton"], TX: ["Houston", "Dallas", "Austin"],
  CA: ["Sacramento", "San Diego", "Fresno"], NY: ["Albany", "Buffalo", "Rochester"], CO: ["Denver", "Aurora", "Boulder"], NC: ["Charlotte", "Raleigh", "Durham"],
  SC: ["Columbia", "Greenville"], WI: ["Milwaukee", "Madison"], NV: ["Las Vegas", "Reno"], AL: ["Birmingham", "Mobile"], ID: ["Boise"], OR: ["Portland", "Eugene"],
  PA: ["Pittsburgh", "Allentown"], OK: ["Tulsa", "Oklahoma City"],
};
const HOSP_PREFIX = ["St. Brigid", "Northgate", "Cedar Valley", "Mercy Plains", "Bayside", "Summit", "Oak Hollow", "Granite Ridge", "Willow Creek", "Harbor Point", "Prairie View", "Elm Street"];
const HOSP_SUFFIX = ["Medical Center", "Regional Hospital", "Health", "Surgical Center", "University Hospital", "Community Hospital"];
const hospital = () => `${pick(HOSP_PREFIX)} ${pick(HOSP_SUFFIX)}`;

const CASE_LABEL: Record<CaseType, string> = { general: "General", cardiac: "Cardiac", pediatric: "Pediatric", obstetric: "Obstetric", regional: "Regional", trauma: "Trauma" };

const TAXONOMY = { CRNA: "367500000X · Nurse Anesthetist, Certified Registered", Anesthesiologist: "207L00000X · Anesthesiology", CAA: "367H00000X · Anesthesiologist Assistant" };

// Scenarios that show verification catching what a self-reported profile hides.
const LAPSED_LICENCE = new Set(["P49"]); // lists GA as active; board says expired
const DEA_EXPIRED = new Set(["P20"]);
const BOARD_LAPSED = new Set(["P31"]);
const EXCLUSION_REVIEW = new Set(["P55"]);
const RENEWAL_DUE = new Set(["P13", "P57"]);

function licenceSource(role: Provider["role"], state: string) {
  if (role === "CRNA") return `${STATE_NAME[state]} Board of Nursing · licence lookup`;
  return `${STATE_NAME[state]} Medical Board · licence lookup`;
}

function verify(p: Provider, anchor: Job): Verification {
  const type = p.role === "CRNA" ? "APRN-CRNA" : p.role === "CAA" ? "Anesthesiologist Assistant" : p.yearsExperience % 3 === 0 ? "Physician (DO)" : "Physician (MD)";
  const prefix = p.role === "CRNA" ? "APRN" : p.role === "CAA" ? "AA" : "MD";
  const licences = p.licenses.map((state) => {
    const lapsed = LAPSED_LICENCE.has(p.id) && state === anchor.state;
    const renewal = RENEWAL_DUE.has(p.id) && state === anchor.state;
    return {
      state,
      type,
      number: `${prefix}${digits(6)}`,
      status: lapsed ? ("Expired" as const) : ("Active" as const),
      expires: lapsed ? "2026-09-30" : renewal ? addDays(anchor.startDate, -20) : `${int(2027, 2028)}-${String(int(1, 12)).padStart(2, "0")}-${pick(["28", "30", "31"]).replace("31", "30")}`,
      discipline: "None on record",
      source: licenceSource(p.role, state),
      checkedAt: stamp(int(0, 6)),
      selfReported: true,
    };
  });
  const dea = p.deaStates.map((state) => {
    const expired = DEA_EXPIRED.has(p.id) && state === anchor.state;
    return {
      state,
      number: `${pick(["A", "B", "F", "M"])}${p.name.split(" ")[1][0]}•••••${digits(2)}`,
      schedules: p.role === "CRNA" ? "2, 2N, 3, 3N, 4, 5" : "2, 2N, 3, 3N, 4, 5",
      status: expired ? ("Expired" as const) : ("Active" as const),
      expires: expired ? "2026-10-31" : `${int(2027, 2029)}-${String(int(1, 12)).padStart(2, "0")}-30`,
      source: "DEA Diversion Control · registration validation",
      checkedAt: stamp(int(0, 6)),
    };
  });
  const board =
    p.role === "CRNA"
      ? { body: "NBCRNA", credential: "Certified Registered Nurse Anesthetist", source: "NBCRNA · credential verification" }
      : p.role === "CAA"
        ? { body: "NCCAA", credential: "Certified Anesthesiologist Assistant", source: "NCCAA · certification verification" }
        : { body: "ABA", credential: "Diplomate, American Board of Anesthesiology", source: "ABA · certification verification" };
  const boardStatus = BOARD_LAPSED.has(p.id) ? ("Lapsed" as const) : p.boardCertified ? ("Active" as const) : ("Eligible" as const);
  return {
    npi: `19${digits(8)}`,
    npiStatus: "Active",
    taxonomy: TAXONOMY[p.role],
    npiSource: "NPPES NPI Registry (CMS)",
    npiCheckedAt: stamp(int(0, 6)),
    licences,
    dea,
    board: { ...board, status: boardStatus, validThrough: boardStatus === "Lapsed" ? "2026-07-31" : `${int(2027, 2030)}-07-31`, checkedAt: stamp(int(0, 6)) },
    exclusions: [
      EXCLUSION_REVIEW.has(p.id)
        ? { list: "OIG LEIE", result: "Possible match", detail: "Name + state match an excluded individual; DOB not yet compared. Held for manual review.", checkedAt: stamp(0) }
        : { list: "OIG LEIE", result: "Clear", detail: "No match", checkedAt: stamp(int(0, 3)) },
      { list: "SAM.gov", result: "Clear", detail: "No active exclusion", checkedAt: stamp(int(0, 3)) },
    ],
  };
}

const CHANNELS = [
  { channel: "Applied on Levels.ai", detail: (p: Provider) => `Created a profile and set job alerts for ${p.preferredStates.join(", ")}` },
  { channel: "NPI registry sourcing", detail: (p: Provider) => `Found in an NPPES search for ${p.role === "Anesthesiologist" ? "Anesthesiology (207L00000X)" : p.role === "CRNA" ? "CRNA (367500000X)" : "Anesthesiologist Assistant (367H00000X)"} in ${p.licenses[0]}; replied to outreach email` },
  { channel: "Referral", detail: () => `Referred by a provider already placed through Levels.ai` },
  { channel: "Anesthesia job board", detail: () => `Applied to a role syndicated to an anesthesia job board` },
  { channel: "Facility ATS import", detail: () => `Past applicant in a partner facility's ATS, re-engaged with consent` },
];

function cv(p: Provider, v: Verification): Omit<Profile, "providerId" | "verification" | "source" | "journey"> {
  const home = p.licenses[0];
  const homeCity = `${pick(CITY[home] ?? ["Springfield"])}, ${home}`;
  const startYear = 2026 - p.yearsExperience;
  const education: Profile["education"] = [];
  const experience: Profile["experience"] = [];
  const focus = p.caseExperience.filter((c) => c !== "general");
  const skills: string[] = [];

  if (p.role === "CRNA") {
    education.push(
      { degree: pick(["Doctor of Nursing Practice (DNP), Nurse Anesthesia", "Doctor of Nurse Anesthesia Practice (DNAP)", "MSN, Nurse Anesthesia"]), school: pick(["Ridgeview University Nurse Anesthesia Program", "Coastal Health Sciences University", "Midland State University CRNA Program"]), years: `${startYear - 3}–${startYear}` },
      { degree: "BSN", school: pick(["Lakemont College of Nursing", "Southern Plains University School of Nursing", "Eastbrook University"]), years: `${startYear - 9}–${startYear - 5}` }
    );
  } else if (p.role === "CAA") {
    education.push(
      { degree: "MS, Anesthesiologist Assistant", school: pick(["Southern Plains University AA Program", "Eastbrook University AA Program"]), years: `${startYear - 2}–${startYear}` },
      { degree: "BS, Biology (pre-med)", school: pick(["Ridgeview University", "Midland State University"]), years: `${startYear - 6}–${startYear - 2}` }
    );
  } else {
    const fellowship: Partial<Record<CaseType, string>> = {
      cardiac: "Adult Cardiothoracic Anesthesiology Fellowship",
      pediatric: "Pediatric Anesthesiology Fellowship",
      regional: "Regional Anesthesiology & Acute Pain Medicine Fellowship",
      obstetric: "Obstetric Anesthesiology Fellowship",
    };
    const f = focus.find((c) => fellowship[c]);
    if (f) education.push({ degree: fellowship[f]!, school: `${pick(["Eastbrook", "Pacific Northwest", "Great Lakes"])} University Hospital`, years: `${startYear - 1}–${startYear}` });
    education.push(
      { degree: "Anesthesiology Residency (CA-1 to CA-3)", school: `${pick(["Eastbrook", "Ridgeview", "Great Lakes"])} University Hospital`, years: `${startYear - 4}–${startYear - (f ? 1 : 0)}` },
      { degree: v.licences[0].type.includes("DO") ? "Doctor of Osteopathic Medicine (DO)" : "Doctor of Medicine (MD)", school: pick(["Eastbrook University School of Medicine", "Pacific Northwest College of Osteopathic Medicine", "Midland State College of Medicine"]), years: `${startYear - 8}–${startYear - 4}` }
    );
  }

  // Work history, most recent first.
  let cursor = 2026;
  let remaining = Math.max(p.yearsExperience, 1);
  const states = [...p.licenses];
  while (remaining > 0) {
    const span = Math.min(remaining, int(2, 5));
    const st = states.shift() ?? home;
    const title = p.role === "CRNA" ? "Staff CRNA" : p.role === "CAA" ? "Certified Anesthesiologist Assistant" : experience.length === 0 && p.yearsExperience > 8 ? "Staff Anesthesiologist, Section Lead" : "Staff Anesthesiologist";
    const bullets: string[] = [];
    const vol = int(900, 1400);
    bullets.push(`~${vol.toLocaleString()} anesthetics a year in a ${pick(["14", "18", "22", "30"])}-OR ${pick(["Level I trauma centre", "community hospital", "academic centre", "surgery centre"])}`);
    if (focus.includes("cardiac")) bullets.push(pick(["Open-heart, valve and TAVR cases; arterial and central line placement", "Cardiac room 2 days a week; post-bypass hemodynamic management"]));
    if (focus.includes("pediatric")) bullets.push("Pediatric ENT, ortho and GI sedation, including under-2s");
    if (focus.includes("obstetric")) bullets.push("Labor epidural service and urgent/emergent C-sections");
    if (focus.includes("regional")) bullets.push("Ultrasound-guided blocks: interscalene, adductor canal, popliteal, ESP");
    if (focus.includes("trauma")) bullets.push("Trauma activations, massive transfusion protocol, nights as sole provider");
    experience.push({ title, org: hospital(), location: `${pick(CITY[st] ?? ["—"])}, ${st}`, from: String(cursor - span), to: experience.length === 0 ? "Present" : String(cursor), bullets: bullets.slice(0, 3) });
    cursor -= span;
    remaining -= span;
    if (experience.length >= 3) break;
  }
  if (p.role === "CRNA") {
    experience.push({ title: "ICU Registered Nurse", org: hospital(), location: homeCity, from: String(startYear - 5), to: String(startYear - 3), bullets: [pick(["CVICU: post-op hearts, vasoactive drips, IABP", "SICU/trauma ICU: ventilated patients, arterial lines, CRRT"])] });
  }

  const caseLog: Profile["caseLog"] = {};
  for (const c of p.caseExperience) {
    const base = c === "general" ? 520 : c === "regional" ? 260 : c === "obstetric" ? 180 : 90;
    caseLog[c] = Math.round(base * Math.max(1, p.yearsExperience) * (0.7 + rnd() * 0.6));
  }

  if (p.caseExperience.includes("cardiac")) skills.push(p.role === "Anesthesiologist" ? "Advanced perioperative TEE" : "Cardiac / CPB management");
  if (p.caseExperience.includes("regional")) skills.push("Ultrasound-guided regional");
  if (p.caseExperience.includes("obstetric")) skills.push("Labor epidurals / CSE");
  if (p.caseExperience.includes("pediatric")) skills.push("Pediatric airway");
  if (p.caseExperience.includes("trauma")) skills.push("Massive transfusion");
  skills.push("Difficult airway / fiberoptic", "Arterial & central lines", "ACLS / PALS", pick(["Epic Anesthesia", "Cerner SurgiNet", "Epic OpTime"]));

  const headline =
    `${p.role === "Anesthesiologist" ? "Anesthesiologist" : p.role} · ${p.yearsExperience} yrs · ` +
    (focus.length ? focus.map((c) => CASE_LABEL[c]).join(", ") : "General") +
    ` · licensed ${p.licenses.join(", ")}`;

  return {
    headline,
    homeCity,
    education,
    experience,
    caseLog,
    skills: skills.slice(0, 7),
    references: `${int(2, 4)} professional references on file (incl. ${p.role === "Anesthesiologist" ? "department chair" : "chief CRNA / medical director"})`,
    malpractice: rnd() < 0.9 ? "No claims in the last 10 years (attested)" : "1 closed claim, 2019, dismissed (attested, documents on file)",
  };
}

const profiles: Profile[] = providers.map((p, i) => {
  const anchor = jobs[i % jobs.length]; // the role this provider was generated around
  const verification = verify(p, anchor);
  const src = CHANNELS[int(0, CHANNELS.length - 1)];
  const sourced = addDays(TODAY, -int(14, 90));
  const journey = [
    { date: sourced, event: src.channel === "Applied on Levels.ai" ? "Created profile on Levels.ai" : `Sourced: ${src.channel}` },
    ...(src.channel === "NPI registry sourcing" ? [{ date: addDays(sourced, int(1, 4)), event: "Replied to outreach, completed profile" }] : []),
    { date: addDays(sourced, int(5, 9)), event: "CV and case log parsed into structured profile" },
    { date: verification.npiCheckedAt.slice(0, 10), event: "Credentials verified at primary sources" },
    { date: TODAY, event: "Matched against open roles" },
  ];
  return { providerId: p.id, ...cv(p, verification), source: { channel: src.channel, detail: src.detail(p), date: sourced }, journey, verification };
});

const R = (text: string, rule: string, verifiedBy: string) => ({ text, rule, verifiedBy });
const jds: JobDescription[] = [
  {
    jobId: "J1", postedBy: "Talent Acquisition, Riverbend Medical Center", postedAt: "2026-11-04",
    about: "Riverbend is a 410-bed Level II hospital in north Atlanta with 22 operating rooms and a fast-growing open-heart program (6–8 pumps a week). The anesthesia department runs a care-team model with 1:3 medical direction and a dedicated cardiac team.",
    responsibilities: ["Provide anesthesia for general, vascular and cardiac cases under 1:3 medical direction", "Manage CPB cases with the cardiac attending, including line placement and post-bypass hemodynamics", "Take in-house call on rotation (post-call day off)", "Precept SRNA/AA students on general rooms"],
    requirements: [R("CRNA or Certified Anesthesiologist Assistant", "Role", "NPI taxonomy"), R("Active, unrestricted Georgia licence", "State licence", "Georgia Board of Nursing / Georgia Medical Board"), R("Current NBCRNA or NCCAA certification", "Board certification", "NBCRNA / NCCAA verification"), R("2+ years' independent clinical experience", "Experience", "Work history"), R("General and cardiac case experience", "Case mix", "Case log"), R("Not excluded from federal healthcare programs", "Exclusion screening", "OIG LEIE · SAM.gov"), R("Able to start by mid-January 2027", "Start date", "Availability + credentialing time")],
    niceToHave: ["CVICU nursing background", "TEE familiarity", "Precepting experience"],
    schedule: "4×10s with 1:5 in-house call, post-call day off",
    benefits: ["$215K–$245K base + call pay", "$15K sign-on", "6 weeks PTO + CME $3,000", "403(b) with 6% match"],
  },
  {
    jobId: "J2", postedBy: "Department of Anesthesiology, Lakeshore Children's", postedAt: "2026-11-01",
    about: "A 288-bed free-standing children's hospital in Chicago. Neonates through adolescents across 16 ORs plus GI, MRI and cath lab sedation. Strong education culture with an in-house simulation centre.",
    responsibilities: ["Pediatric anesthesia for ENT, ortho, general surgery and off-site sedation", "Pre-op assessment with families and child-life team", "Q6 weekend call"],
    requirements: [R("CRNA", "Role", "NPI taxonomy"), R("Active Illinois APRN-CRNA licence", "State licence", "Illinois licence lookup (IDFPR)"), R("NBCRNA certification", "Board certification", "NBCRNA verification"), R("3+ years' experience", "Experience", "Work history"), R("Pediatric experience required", "Case mix", "Case log"), R("Exclusion-list clear", "Exclusion screening", "OIG LEIE · SAM.gov"), R("Start February 2027", "Start date", "Availability + credentialing time")],
    niceToHave: ["Neonatal experience", "PALS instructor"],
    schedule: "5×8s, Q6 weekend call",
    benefits: ["$225K–$255K", "Relocation up to $10K", "Tuition support", "Pension + 403(b)"],
  },
  {
    jobId: "J3", postedBy: "Practice Manager, Sunvale Surgery Center", postedAt: "2026-11-10",
    about: "A CRNA-only ambulatory surgery centre in Phoenix focused on orthopedics and sports medicine. Every day is block-heavy; same-day discharge for most joints.",
    responsibilities: ["Independent anesthesia for outpatient ortho", "Ultrasound-guided peripheral nerve blocks daily", "Post-op block follow-up calls"],
    requirements: [R("CRNA", "Role", "NPI taxonomy"), R("Active Arizona licence", "State licence", "Arizona State Board of Nursing"), R("Arizona DEA registration", "DEA registration", "DEA registration validation"), R("NBCRNA certification", "Board certification", "NBCRNA verification"), R("3+ years", "Experience", "Work history"), R("Regional anesthesia experience", "Case mix", "Case log"), R("1099 independent contractor", "Contract type", "Provider preferences"), R("Start late December", "Start date", "Availability + credentialing time")],
    niceToHave: ["Continuous catheter experience"],
    schedule: "Mon–Fri days, no call, no weekends",
    benefits: ["$175–$200/hr 1099", "Guaranteed 36 hrs/week"],
  },
  {
    jobId: "J4", postedBy: "Chief of Anesthesiology, Gulf Coast Regional", postedAt: "2026-10-28",
    about: "A busy Tampa hospital with 4,500 deliveries a year and a physician-led care team. In-house OB call; partnership track.",
    responsibilities: ["Cover L&D and general ORs", "Run the labor epidural service and OB emergencies", "Supervise CRNAs on general rooms"],
    requirements: [R("Anesthesiologist (MD/DO)", "Role", "NPI taxonomy"), R("Active Florida medical licence", "State licence", "Florida Board of Medicine"), R("Florida DEA registration", "DEA registration", "DEA registration validation"), R("Board eligible or certified (certification within 2 years)", "Advisory", "ABA verification"), R("OB and general experience", "Case mix", "Case log"), R("Exclusion-list clear", "Exclusion screening", "OIG LEIE · SAM.gov"), R("Start March 2027", "Start date", "Availability + credentialing time")],
    niceToHave: ["OB anesthesiology fellowship"],
    schedule: "In-house OB call 1:5",
    benefits: ["$500K–$560K", "Partnership after 2 years", "Malpractice with tail"],
  },
  {
    jobId: "J5", postedBy: "Locum coordinator, High Plains Health", postedAt: "2026-11-12",
    about: "A rural critical-access hospital in Montana. The CRNA is the sole anesthesia provider on shift, covering C-sections, trauma and blocks.",
    responsibilities: ["Sole anesthesia provider: OB, trauma, general", "Labor epidurals and C-sections", "Regional blocks for ortho trauma"],
    requirements: [R("CRNA", "Role", "NPI taxonomy"), R("Active Montana licence", "State licence", "Montana Board of Nursing"), R("Montana DEA registration", "DEA registration", "DEA registration validation"), R("NBCRNA certification", "Board certification", "NBCRNA verification"), R("5+ years", "Experience", "Work history"), R("OB, trauma and regional experience", "Case mix", "Case log"), R("Locum assignment", "Contract type", "Provider preferences"), R("Start mid-December", "Start date", "Availability + credentialing time")],
    niceToHave: ["Rural/independent practice history"],
    schedule: "7 on / 7 off, home call",
    benefits: ["$190–$215/hr", "Housing + travel covered", "Malpractice covered"],
  },
  {
    jobId: "J6", postedBy: "Medical Director, Pinecrest Ambulatory Surgery", postedAt: "2026-11-08",
    about: "A physician-only ambulatory centre in Seattle. Block-heavy total joints with same-day discharge. 3-month renewable locum.",
    responsibilities: ["Anesthesia for ambulatory ortho and total joints", "Regional anesthesia and multimodal pain plans"],
    requirements: [R("Anesthesiologist", "Role", "NPI taxonomy"), R("Active Washington licence", "State licence", "Washington Medical Commission"), R("Washington DEA registration", "DEA registration", "DEA registration validation"), R("ABA board certified", "Board certification", "ABA verification"), R("3+ years", "Experience", "Work history"), R("Regional experience", "Case mix", "Case log"), R("Locum assignment", "Contract type", "Provider preferences"), R("Start January 2027", "Start date", "Availability + credentialing time")],
    niceToHave: ["Regional fellowship"],
    schedule: "Weekdays only, no call",
    benefits: ["$290–$330/hr", "Travel + lodging"],
  },
  {
    jobId: "J7", postedBy: "Talent Acquisition, Buckeye Valley Hospital", postedAt: "2026-11-06",
    about: "A community teaching hospital in Columbus with a care-team model (1:4). New graduates welcome with a 12-week orientation.",
    responsibilities: ["General, vascular and OB anesthesia", "Labor epidural service", "Precept students"],
    requirements: [R("CAA or CRNA", "Role", "NPI taxonomy"), R("Active Ohio licence", "State licence", "Ohio Board of Nursing / State Medical Board of Ohio"), R("NCCAA or NBCRNA certification", "Board certification", "NCCAA / NBCRNA verification"), R("General and OB experience", "Case mix", "Case log"), R("Exclusion-list clear", "Exclusion screening", "OIG LEIE · SAM.gov"), R("Start mid-February", "Start date", "Availability + credentialing time")],
    niceToHave: ["Vascular experience"],
    schedule: "4×10s, 1:6 call",
    benefits: ["$190K–$220K", "12-week orientation", "Loan repayment up to $20K"],
  },
  {
    jobId: "J8", postedBy: "Chair, Cardiac Anesthesia, Lone Star Heart Institute", postedAt: "2026-10-30",
    about: "A high-volume cardiothoracic centre in Houston: CABG, valves, TAVR, LVAD and transplant.",
    responsibilities: ["Cardiac anesthesia for CT surgery and structural heart", "Advanced perioperative TEE", "Call 1:6"],
    requirements: [R("Anesthesiologist", "Role", "NPI taxonomy"), R("Active Texas medical licence", "State licence", "Texas Medical Board"), R("Texas DEA registration", "DEA registration", "DEA registration validation"), R("ABA board certified", "Board certification", "ABA verification"), R("2+ years", "Experience", "Work history"), R("Cardiac experience", "Case mix", "Case log"), R("Start April 2027", "Start date", "Availability + credentialing time")],
    niceToHave: ["Adult cardiothoracic fellowship", "Advanced PTE certification"],
    schedule: "Call 1:6",
    benefits: ["$560K–$620K", "Signing bonus", "Academic appointment available"],
  },
];

const byId = new Map(profiles.map((p) => [p.providerId, p]));
const eligibility = jobs.flatMap((j) => providers.map((p) => checkPair(p, j, byId.get(p.id)!.verification)));

writeFileSync("data/profiles.json", JSON.stringify(profiles, null, 1));
writeFileSync("data/jd.json", JSON.stringify(jds, null, 1));
writeFileSync("src/data/eligibility.json", JSON.stringify(eligibility));
for (const j of jobs) {
  const e = eligibility.filter((x) => x.jobId === j.id && x.eligible);
  console.log(j.id, e.length, e.map((x) => x.providerId).join(","));
}
