/**
 * Layer 2: LLM ranking of eligible pairs, run once at build time.
 *
 *   GEMINI_API_KEY=... npm run rank
 *
 * - Hard eligibility (src/lib/eligibility.ts) runs first; the model only ever sees eligible pairs,
 *   so it can't "talk itself into" an unlicensed or uncredentialable provider.
 * - The model scores soft fit and writes a reason for each side of the marketplace.
 * - A separate recruiter rubric labels the same pairs so we can measure agreement (the eval loop).
 *
 * Output: src/data/matches.json (the web app is static; no API key ships to the browser).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { checkPair } from "../src/lib/eligibility";
import type { AiMatch, Job, Label, MatchesFile, Profile, Provider } from "../src/lib/types";

const MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.8-flash").split(",");
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error("Set GEMINI_API_KEY");

const jobs: Job[] = JSON.parse(readFileSync("data/jobs.json", "utf8"));
const providers: Provider[] = JSON.parse(readFileSync("data/providers.json", "utf8"));
const byId = new Map(providers.map((p) => [p.id, p]));

// Use verified credentials when available (npm run enrich), so the model never sees a blocked provider.
const profiles: Profile[] = existsSync("data/profiles.json") ? JSON.parse(readFileSync("data/profiles.json", "utf8")) : [];
const verByProvider = new Map(profiles.map((p) => [p.providerId, p.verification]));
const eligibility = jobs.flatMap((j) => providers.map((p) => checkPair(p, j, verByProvider.get(p.id))));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callModel(prompt: string): Promise<{ model: string; text: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    let res: Response;
    try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(240_000),
    });
    } catch (e) {
      console.warn(`  ${model} -> ${(e as Error).message}, retrying`);
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const body: any = await res.json();
      return { model, text: body.candidates[0].content.parts.map((p: any) => p.text ?? "").join("") };
    }
    console.warn(`  ${model} -> HTTP ${res.status}, retrying`);
    await sleep(3000 * (attempt + 1));
  }
  throw new Error("Model unavailable after retries");
}

function promptFor(job: Job, candidates: Provider[]) {
  const strip = ({ name, ...rest }: Provider) => rest; // names never sent to the model
  return `You are a senior anesthesia recruiter ranking candidates for one job.
All candidates below have ALREADY passed hard eligibility (role, state licence, DEA where required,
board certification, required case mix, experience, contract type, start date). Do not re-judge those.

Score SOFT FIT 0-100 using: location preference / willingness to relocate, pay expectation vs the job's range,
call and schedule fit, depth and relevance of case experience beyond the minimum, and goals stated in the bio.
70+ means "a recruiter should call this person this week".

Return a JSON array, one object per candidate:
{"providerId": string, "score": number, "recruiterReason": string (max 22 words, for the hiring team),
 "providerPitch": string (max 22 words, addressed to the provider, why this job suits them),
 "concerns": string[] (0-2 items, max 10 words each)}

JOB:
${JSON.stringify(job, null, 1)}

CANDIDATES:
${JSON.stringify(candidates.map(strip), null, 1)}`;
}

function rubricLabel(p: Provider, j: Job): Label {
  const why: string[] = [];
  const locationOk = p.preferredStates.includes(j.state) || p.openToRelocation;
  if (!locationOk) why.push(`prefers ${p.preferredStates.join("/")}, not open to relocating`);
  const payOk = j.payAnnual ? (p.minAnnualPay ?? 0) <= j.payAnnual[1] : (p.minHourlyPay ?? 0) <= (j.payHourly?.[1] ?? 0);
  if (!payOk) why.push("pay expectation above the job's range");
  const callOk = !j.callRequired || p.takesCall;
  if (!callOk) why.push("job requires call, provider avoids call");
  return {
    providerId: p.id,
    jobId: j.id,
    label: why.length ? "weak" : "good",
    why: why.length ? why.join("; ") : "location, pay and call all fit",
  };
}

const matches: AiMatch[] = [];
const labels: Label[] = [];
let modelUsed = MODELS[0];

for (const job of jobs) {
  const eligible = eligibility.filter((e) => e.jobId === job.id && e.eligible).map((e) => byId.get(e.providerId)!);
  console.log(`${job.id}: ${eligible.length} eligible`);
  if (!eligible.length) continue;
  const { model, text } = await callModel(promptFor(job, eligible));
  modelUsed = model;
  const parsed: any[] = JSON.parse(text);
  for (const m of parsed) {
    if (!byId.has(m.providerId)) continue;
    matches.push({
      providerId: m.providerId,
      jobId: job.id,
      score: Math.max(0, Math.min(100, Math.round(m.score))),
      recruiterReason: m.recruiterReason,
      providerPitch: m.providerPitch,
      concerns: (m.concerns ?? []).slice(0, 2),
    });
  }
  eligible.forEach((p) => labels.push(rubricLabel(p, job)));
}

const out: MatchesFile = { generatedAt: new Date().toISOString(), model: modelUsed, eligibility, matches, labels };
writeFileSync("src/data/matches.json", JSON.stringify(out, null, 1));
console.log(`Wrote ${matches.length} AI matches, ${labels.length} labels, model ${modelUsed}`);
