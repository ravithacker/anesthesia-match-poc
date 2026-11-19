/**
 * Generates the sample dataset: 8 hand-written jobs + 64 synthetic providers.
 * Every person and facility is fictional. Deterministic (seeded) so results are reproducible.
 */
import { writeFileSync } from "node:fs";
import type { CaseType, Contract, Job, Provider, Role } from "../src/lib/types";

let seed = 20261119;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;
const sample = <T>(a: T[], n: number) => [...a].sort(() => rnd() - 0.5).slice(0, n);

export const jobs: Job[] = [
  {
    id: "J1", title: "Staff CRNA / CAA, Cardiac & General", facility: "Riverbend Medical Center", city: "Atlanta", state: "GA",
    acceptedRoles: ["CRNA", "CAA"], careModel: "Anesthesia care team (1:3 medical direction)", requiredCases: ["general", "cardiac"],
    minYears: 2, requiresBoardCert: true, requiresDEA: false, contract: "W2", callRequired: true, payAnnual: [215000, 245000],
    startDate: "2027-01-18",
    description: "Level II hospital, 22 ORs. Growing open-heart program (6-8 hearts/week). Post-call day off. Mentorship from cardiac attendings for providers newer to hearts.",
  },
  {
    id: "J2", title: "Pediatric CRNA", facility: "Lakeshore Children's Hospital", city: "Chicago", state: "IL",
    acceptedRoles: ["CRNA"], careModel: "Anesthesia care team", requiredCases: ["pediatric"],
    minYears: 3, requiresBoardCert: true, requiresDEA: false, contract: "W2", callRequired: true, payAnnual: [225000, 255000],
    startDate: "2027-02-01",
    description: "Free-standing children's hospital. Neonates through adolescents, ENT, ortho, GI sedation. Q6 weekend call. Strong education culture.",
  },
  {
    id: "J3", title: "CRNA, Outpatient Ortho & Regional", facility: "Sunvale Surgery Center", city: "Phoenix", state: "AZ",
    acceptedRoles: ["CRNA"], careModel: "CRNA-only practice", requiredCases: ["regional"],
    minYears: 3, requiresBoardCert: true, requiresDEA: true, contract: "1099", callRequired: false, payHourly: [175, 200],
    startDate: "2026-12-21",
    description: "Busy ASC, ortho and sports medicine. Ultrasound-guided blocks every day (interscalene, adductor canal, popliteal). No nights, no weekends, no call.",
  },
  {
    id: "J4", title: "Anesthesiologist, OB-heavy", facility: "Gulf Coast Regional Hospital", city: "Tampa", state: "FL",
    acceptedRoles: ["Anesthesiologist"], careModel: "Physician-led care team", requiredCases: ["obstetric", "general"],
    minYears: 1, requiresBoardCert: false, requiresDEA: true, contract: "W2", callRequired: true, payAnnual: [500000, 560000],
    startDate: "2027-03-01",
    description: "4,500 deliveries/year, in-house OB call 1:5. Board eligible welcome with certification within 2 years. Partnership track after 2 years.",
  },
  {
    id: "J5", title: "Locum CRNA, Rural Critical Access", facility: "High Plains Health", city: "Billings", state: "MT",
    acceptedRoles: ["CRNA"], careModel: "CRNA independent practice", requiredCases: ["obstetric", "trauma", "regional"],
    minYears: 5, requiresBoardCert: true, requiresDEA: true, contract: "Locum", callRequired: true, payHourly: [190, 215],
    startDate: "2026-12-15",
    description: "Sole anesthesia provider on shift. C-sections, trauma, epidurals, blocks. 7-on/7-off with home call. Housing and travel covered.",
  },
  {
    id: "J6", title: "Locum Anesthesiologist, Ambulatory Ortho", facility: "Pinecrest Ambulatory Surgery", city: "Seattle", state: "WA",
    acceptedRoles: ["Anesthesiologist"], careModel: "Physician-only", requiredCases: ["regional"],
    minYears: 3, requiresBoardCert: true, requiresDEA: true, contract: "Locum", callRequired: false, payHourly: [290, 330],
    startDate: "2027-01-05",
    description: "3-month renewable assignment. Block-heavy ortho, total joints same-day discharge. Weekdays only.",
  },
  {
    id: "J7", title: "CAA / CRNA, General & OB", facility: "Buckeye Valley Hospital", city: "Columbus", state: "OH",
    acceptedRoles: ["CAA", "CRNA"], careModel: "Anesthesia care team (1:4)", requiredCases: ["general", "obstetric"],
    minYears: 0, requiresBoardCert: true, requiresDEA: false, contract: "W2", callRequired: true, payAnnual: [190000, 220000],
    startDate: "2027-02-15",
    description: "Community teaching hospital. New grads welcome with a 12-week orientation. Labor epidural service, general and some vascular.",
  },
  {
    id: "J8", title: "Cardiac Anesthesiologist (TEE)", facility: "Lone Star Heart Institute", city: "Houston", state: "TX",
    acceptedRoles: ["Anesthesiologist"], careModel: "Physician-led care team", requiredCases: ["cardiac"],
    minYears: 2, requiresBoardCert: true, requiresDEA: true, contract: "W2", callRequired: true, payAnnual: [560000, 620000],
    startDate: "2027-04-01",
    description: "High-volume CT surgery, TAVR, LVAD, transplant. Advanced perioperative TEE expected. Call 1:6.",
  },
];

const FIRST = ["Maya", "Daniel", "Priya", "Marcus", "Elena", "James", "Aisha", "Tom", "Grace", "Luis", "Hannah", "Omar", "Sofia", "Ben", "Chloe", "Ryan", "Nadia", "Kevin", "Laura", "Andre", "Ivy", "Sam", "Rachel", "Victor", "Jenna", "Colin", "Tara", "Miguel", "Erin", "Paul", "Leah", "Noah", "Dana", "Raj", "Megan", "Chris", "Kara", "Eli", "Zoe", "Adam"];
const LAST = ["Holloway", "Brandt", "Okafor", "Lindqvist", "Ramos", "Patel", "Whitaker", "Nguyen", "Castillo", "Mercer", "Dubois", "Feld", "Harper", "Kowalski", "Yates", "Sorensen", "Abbott", "Fischer", "Greer", "Navarro"];
const STATES = ["GA", "IL", "AZ", "FL", "MT", "WA", "OH", "TX", "CA", "NY", "CO", "NC"];
const CAA_STATES = ["GA", "FL", "OH", "TX", "CO", "NC"]; // demo subset only

const GOALS: Record<string, string[]> = {
  cardiac: ["wants to do more hearts", "loves the pace of cardiac cases", "looking to keep cardiac skills sharp"],
  pediatric: ["enjoys working with kids and their families", "wants a pediatric-focused role long term"],
  obstetric: ["comfortable running a busy labor floor", "likes OB and doesn't mind nights"],
  regional: ["strong with ultrasound-guided blocks", "wants a block-heavy practice"],
  trauma: ["has worked trauma at a Level I centre", "is calm as the only anesthesia provider in the building"],
  general: ["happy with a broad general mix"],
};
const LIFE = [
  "Spouse is relocating for work, so open to a move.",
  "Has school-age kids, so predictable hours matter.",
  "Wants to pay off loans quickly; pay is the priority.",
  "Burnt out on heavy call and wants a lighter schedule.",
  "Enjoys travel assignments between longer stays at home.",
  "Wants a teaching environment and to precept students.",
  "Looking for a partnership or leadership track.",
  "Prefers a smaller, collegial department.",
];

const NEIGHBOR: Record<string, string> = { GA: "SC", IL: "WI", AZ: "NV", FL: "AL", MT: "ID", WA: "OR", OH: "PA", TX: "OK" };
const addDays = (iso: string, d: number) => { const x = new Date(iso + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

/** Each provider is generated around an "anchor" job, then ~40% get one deliberate near-miss. */
function makeProvider(i: number, job: Job): Provider {
  const role = pick(job.acceptedRoles);
  const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length) * 3) % LAST.length]}`;
  const years = job.minYears + Math.floor(rnd() * 12);
  const otherStates = sample(STATES.filter((s) => s !== job.state && (role !== "CAA" || CAA_STATES.includes(s))), Math.floor(rnd() * 2));
  let licenses = [job.state, ...otherStates];
  let deaStates = role === "CAA" ? [] : [...licenses];
  const others: CaseType[] = (["cardiac", "obstetric", "regional", "pediatric", "trauma"] as CaseType[]).filter((c) => !job.requiredCases.includes(c));
  let caseExperience: CaseType[] = Array.from(new Set<CaseType>(["general", ...job.requiredCases, ...sample(others, Math.floor(rnd() * 2))]));
  let contracts: Contract[] = role === "CAA" ? ["W2"] : job.contract === "W2" ? (chance(0.7) ? ["W2"] : ["W2", "Locum"]) : chance(0.6) ? ["Locum", "1099"] : ["W2", "1099", "Locum"];
  let availableFrom = addDays(job.startDate, -[60, 30, 14, 0][Math.floor(rnd() * 4)]);
  if (availableFrom < "2026-11-20") availableFrom = "2026-11-20";
  let credentialingDocsReady = chance(0.7) || job.startDate < "2027-01-10";
  let boardCertified = chance(0.93);

  // Deliberate near-miss so the demo shows the filter doing real work.
  if (chance(0.33)) {
    const miss = pick(["licence", "dea", "case", "start", "contract"]);
    if (miss === "licence") { licenses = [NEIGHBOR[job.state], ...otherStates]; deaStates = role === "CAA" ? [] : [...licenses]; }
    if (miss === "dea" && job.requiresDEA) deaStates = deaStates.filter((s) => s !== job.state);
    if (miss === "case") caseExperience = caseExperience.filter((c) => c !== job.requiredCases[job.requiredCases.length - 1]);
    if (miss === "start") { availableFrom = addDays(job.startDate, 45); credentialingDocsReady = false; }
    if (miss === "contract" && role !== "CAA") contracts = job.contract === "W2" ? ["Locum", "1099"] : ["W2"];
  }

  const takesCall = chance(0.65);
  const preferredStates = chance(0.6) ? [job.state] : sample(STATES, 2);
  const [aLo, aHi] = job.payAnnual ?? [0, 0];
  const [hLo, hHi] = job.payHourly ?? [0, 0];
  const minAnnual = job.payAnnual ? Math.round((aLo + (aHi - aLo) * (rnd() * 1.6 - 0.3)) / 5000) * 5000 : role === "Anesthesiologist" ? 480000 : 200000;
  const minHourly = job.payHourly ? Math.round(hLo + (hHi - hLo) * (rnd() * 1.6 - 0.3)) : role === "Anesthesiologist" ? 280 : 175;
  const focus = caseExperience.filter((c) => c !== "general");
  const goal = GOALS[pick(focus.length ? focus : ["general"])];
  const life = pick(LIFE);
  const bio = [
    `${role === "Anesthesiologist" ? (boardCertified ? "Board-certified" : "Board-eligible") + " anesthesiologist" : role} with ${years} year${years === 1 ? "" : "s"} of experience;`,
    `${pick(goal)}.`,
    life,
    takesCall ? "Fine with call." : "Would rather avoid call.",
  ].join(" ");
  return {
    id: `P${String(i + 1).padStart(2, "0")}`,
    name, role, yearsExperience: years, boardCertified, licenses, deaStates, caseExperience,
    availableFrom, credentialingDocsReady, acceptsContracts: contracts, preferredStates,
    openToRelocation: life.includes("relocating") || chance(0.3),
    takesCall,
    minAnnualPay: contracts.includes("W2") ? minAnnual : undefined,
    minHourlyPay: contracts.some((c) => c !== "W2") ? minHourly : undefined,
    bio,
  };
}

const providers = Array.from({ length: 64 }, (_, i) => makeProvider(i, jobs[i % jobs.length]));

writeFileSync("data/jobs.json", JSON.stringify(jobs, null, 2));
writeFileSync("data/providers.json", JSON.stringify(providers, null, 2));
console.log(`Wrote ${jobs.length} jobs, ${providers.length} providers`);
