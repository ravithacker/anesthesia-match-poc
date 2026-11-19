import { useMemo, useState } from "react";
import jobsData from "../data/jobs.json";
import providersData from "../data/providers.json";
import matchesData from "./data/matches.json";
import type { AiMatch, Job, Label, MatchesFile, PairEligibility, Provider } from "./lib/types";

const jobs = jobsData as Job[];
const providers = providersData as Provider[];
const data = matchesData as MatchesFile;
const pById = new Map(providers.map((p) => [p.id, p]));
const jById = new Map(jobs.map((j) => [j.id, j]));
const key = (p: string, j: string) => `${p}|${j}`;
const aiByPair = new Map<string, AiMatch>(data.matches.map((m) => [key(m.providerId, m.jobId), m]));
const labelByPair = new Map<string, Label>(data.labels.map((l) => [key(l.providerId, l.jobId), l]));
const STRONG = 70;

type View = "recruiter" | "provider" | "accuracy" | "how";

const money = (j: Job) =>
  j.payAnnual
    ? `$${(j.payAnnual[0] / 1000).toFixed(0)}–${(j.payAnnual[1] / 1000).toFixed(0)}K / yr`
    : `$${j.payHourly![0]}–${j.payHourly![1]} / hr`;

function ScorePill({ score }: { score: number }) {
  const tone = score >= STRONG ? "good" : score >= 50 ? "mid" : "low";
  return <span className={`pill pill-${tone}`}>{score}</span>;
}

function FailList({ e }: { e: PairEligibility }) {
  const fails = e.checks.filter((c) => !c.pass);
  return (
    <ul className="fails">
      {fails.map((c) => (
        <li key={c.rule}>
          <b>{c.rule}:</b> {c.detail}
        </li>
      ))}
    </ul>
  );
}

function RecruiterView() {
  const [jobId, setJobId] = useState(jobs[0].id);
  const [showRejected, setShowRejected] = useState(false);
  const job = jById.get(jobId)!;
  const rows = data.eligibility.filter((e) => e.jobId === jobId);
  const eligible = rows
    .filter((e) => e.eligible)
    .map((e) => ({ e, p: pById.get(e.providerId)!, m: aiByPair.get(key(e.providerId, jobId)) }))
    .sort((a, b) => (b.m?.score ?? 0) - (a.m?.score ?? 0));
  const rejected = rows.filter((e) => !e.eligible);
  const nearMiss = rejected.filter((e) => e.checks.filter((c) => !c.pass).length === 1);

  return (
    <div className="grid2">
      <aside className="joblist">
        <h3>Open roles</h3>
        {jobs.map((j) => {
          const n = data.eligibility.filter((e) => e.jobId === j.id && e.eligible).length;
          return (
            <button key={j.id} className={`jobbtn ${j.id === jobId ? "active" : ""}`} onClick={() => setJobId(j.id)}>
              <span className="jt">{j.title}</span>
              <span className="js">
                {j.facility} · {j.city}, {j.state}
              </span>
              <span className="jn">{n} eligible</span>
            </button>
          );
        })}
      </aside>
      <section>
        <div className="card jobcard">
          <div className="row between">
            <div>
              <h2>{job.title}</h2>
              <div className="muted">
                {job.facility} · {job.city}, {job.state} · {job.careModel}
              </div>
            </div>
            <div className="right">
              <div className="big">{money(job)}</div>
              <div className="muted">
                {job.contract} · starts {job.startDate}
              </div>
            </div>
          </div>
          <div className="tags">
            {job.acceptedRoles.map((r) => (
              <span key={r} className="tag">{r}</span>
            ))}
            {job.requiredCases.map((c) => (
              <span key={c} className="tag tag-alt">{c}</span>
            ))}
            {job.requiresDEA && <span className="tag tag-warn">DEA in {job.state}</span>}
            {job.requiresBoardCert && <span className="tag tag-warn">Board certified</span>}
            <span className="tag">{job.callRequired ? "Call required" : "No call"}</span>
          </div>
          <p className="desc">{job.description}</p>
        </div>

        <div className="funnel">
          <div><b>{rows.length}</b><span>providers in pool</span></div>
          <div className="arrow">→</div>
          <div><b>{eligible.length}</b><span>pass hard rules</span></div>
          <div className="arrow">→</div>
          <div><b>{eligible.filter((x) => (x.m?.score ?? 0) >= STRONG).length}</b><span>AI says call this week</span></div>
        </div>

        <h3>Shortlist, ranked by AI soft-fit</h3>
        {eligible.map(({ p, m, e }) => (
          <div key={p.id} className="card cand">
            <div className="row between">
              <div>
                <div className="name">
                  {p.name} <span className="muted">· {p.role} · {p.yearsExperience} yrs · licensed {p.licenses.join(", ")}</span>
                </div>
                <div className="reason">{m?.recruiterReason}</div>
                {!!m?.concerns.length && (
                  <div className="concerns">
                    {m.concerns.map((c) => (
                      <span key={c} className="tag tag-warn">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              {m && <ScorePill score={m.score} />}
            </div>
            <details>
              <summary>Why eligible · can start {e.earliestStart}</summary>
              <ul className="passes">
                {e.checks.map((c) => (
                  <li key={c.rule}>✓ <b>{c.rule}:</b> {c.detail}</li>
                ))}
              </ul>
              <p className="muted small">Profile: {p.bio}</p>
            </details>
          </div>
        ))}

        <button className="linkbtn" onClick={() => setShowRejected(!showRejected)}>
          {showRejected ? "Hide" : "Show"} {nearMiss.length} near-misses (failed exactly one rule)
        </button>
        {showRejected &&
          nearMiss.map((e) => {
            const p = pById.get(e.providerId)!;
            return (
              <div key={p.id} className="card cand rejected">
                <div className="name">
                  {p.name} <span className="muted">· {p.role} · {p.yearsExperience} yrs</span>
                </div>
                <FailList e={e} />
              </div>
            );
          })}
      </section>
    </div>
  );
}

function ProviderView() {
  const [pid, setPid] = useState(providers[0].id);
  const p = pById.get(pid)!;
  const rows = data.eligibility.filter((e) => e.providerId === pid);
  const open = rows
    .filter((e) => e.eligible)
    .map((e) => ({ e, j: jById.get(e.jobId)!, m: aiByPair.get(key(pid, e.jobId)) }))
    .sort((a, b) => (b.m?.score ?? 0) - (a.m?.score ?? 0));
  const closed = rows.filter((e) => !e.eligible && e.checks.filter((c) => !c.pass).length <= 2);

  return (
    <div>
      <div className="card">
        <label className="muted small">Viewing as provider</label>
        <select value={pid} onChange={(ev) => setPid(ev.target.value)}>
          {providers.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.role} · {x.licenses.join("/")}
            </option>
          ))}
        </select>
        <p className="desc">{p.bio}</p>
        <div className="tags">
          {p.caseExperience.map((c) => (
            <span key={c} className="tag tag-alt">{c}</span>
          ))}
          <span className="tag">Licensed {p.licenses.join(", ")}</span>
          <span className="tag">DEA {p.deaStates.length ? p.deaStates.join(", ") : "none"}</span>
          <span className="tag">{p.acceptsContracts.join(" / ")}</span>
          <span className="tag">Available {p.availableFrom}</span>
        </div>
      </div>

      <h3>Roles you qualify for</h3>
      {open.length === 0 && <p className="muted">No roles pass every rule yet. See what's close below.</p>}
      {open.map(({ j, m }) => (
        <div key={j.id} className="card cand">
          <div className="row between">
            <div>
              <div className="name">
                {j.title} <span className="muted">· {j.facility}, {j.city} {j.state} · {money(j)}</span>
              </div>
              <div className="reason">{m?.providerPitch}</div>
            </div>
            {m && <ScorePill score={m.score} />}
          </div>
        </div>
      ))}

      {closed.length > 0 && (
        <>
          <h3>Close, and what would unlock them</h3>
          {closed.map((e) => {
            const j = jById.get(e.jobId)!;
            return (
              <div key={j.id} className="card cand rejected">
                <div className="name">
                  {j.title} <span className="muted">· {j.city}, {j.state}</span>
                </div>
                <FailList e={e} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function AccuracyView() {
  const pairs = data.labels.map((l) => {
    const m = aiByPair.get(key(l.providerId, l.jobId));
    const ai = (m?.score ?? 0) >= STRONG ? "good" : "weak";
    return { l, m, ai, agree: ai === l.label };
  });
  const agree = pairs.filter((x) => x.agree).length;
  const cell = (ai: string, lab: string) => pairs.filter((x) => x.ai === ai && x.l.label === lab).length;
  const disagreements = pairs.filter((x) => !x.agree);

  return (
    <div>
      <div className="card">
        <h2>Does the AI agree with a recruiter?</h2>
        <p className="desc">
          Every eligible pair was also labelled by a simple recruiter checklist (location or relocation, pay within range,
          call fit), written separately from the AI prompt. The AI's call is "good" when its score is {STRONG}+.
          In the paid trial, your recruiters replace this checklist with their own judgement on real profiles.
        </p>
        <div className="funnel">
          <div><b>{Math.round((agree / pairs.length) * 100)}%</b><span>agreement</span></div>
          <div><b>{pairs.length}</b><span>labelled pairs</span></div>
          <div><b>{disagreements.length}</b><span>disagreements to review</span></div>
        </div>
        <table className="cm">
          <thead>
            <tr><th></th><th>Recruiter: good</th><th>Recruiter: weak</th></tr>
          </thead>
          <tbody>
            <tr><th>AI: good</th><td className="ok">{cell("good", "good")}</td><td className="bad">{cell("good", "weak")}</td></tr>
            <tr><th>AI: weak</th><td className="bad">{cell("weak", "good")}</td><td className="ok">{cell("weak", "weak")}</td></tr>
          </tbody>
        </table>
      </div>
      <h3>Disagreements (this is where the prompt and rules get better)</h3>
      {disagreements.map(({ l, m, ai }) => {
        const p = pById.get(l.providerId)!;
        const j = jById.get(l.jobId)!;
        return (
          <div key={key(l.providerId, l.jobId)} className="card cand">
            <div className="row between">
              <div>
                <div className="name">
                  {p.name} → {j.title} <span className="muted">({j.city}, {j.state})</span>
                </div>
                <div className="small"><b>Recruiter checklist: {l.label}</b> · {l.why}</div>
                <div className="small"><b>AI: {ai}</b> · {m?.recruiterReason}</div>
              </div>
              {m && <ScorePill score={m.score} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HowView() {
  return (
    <div className="card how">
      <h2>How it works</h2>
      <ol>
        <li>
          <b>Hard eligibility first (deterministic).</b> Role, state licence, DEA where required, board certification,
          required case mix, years, contract type, and whether the provider can be credentialed by the start date. These
          are plain rules on structured fields (SQL in production), so a provider is never shown a job they can't
          legally take, and every rejection has a reason.
        </li>
        <li>
          <b>AI ranks only what's left.</b> An LLM scores soft fit (location, pay, call, case depth, goals in the bio) and
          writes one reason for the hiring team and one for the provider. Names are never sent to the model.
        </li>
        <li>
          <b>Measured against recruiters.</b> A labelled set of pairs tracks how often the AI agrees with a human, and
          the disagreements are what we tune on.
        </li>
        <li>
          <b>Two-sided.</b> The same match powers the recruiter shortlist and the provider's "roles for you", including
          "what would unlock this role" (e.g. a missing DEA registration).
        </li>
      </ol>
      <h3>What a production version adds</h3>
      <ul>
        <li>Postgres + pgvector, rules as indexed filters, embeddings for retrieval before the LLM ranks the top N.</li>
        <li>Licence and certification verification against primary sources instead of self-reported fields.</li>
        <li>Rules table maintained per state and facility (credentialing times, CAA practice, supervision models).</li>
        <li>Recruiter feedback (shortlisted / rejected) flowing back into the evaluation set.</li>
      </ul>
      <p className="muted small">
        Sample data only: every provider and facility here is fictional, and rule values (e.g. credentialing lead times,
        CAA practice states) are illustrative. AI rankings generated with Gemini Flash models on {data.generatedAt.slice(0, 10)}.
      </p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("recruiter");
  const stats = useMemo(() => {
    const el = data.eligibility.filter((e) => e.eligible).length;
    return { pairs: data.eligibility.length, el };
  }, []);
  const tabs: [View, string][] = [
    ["recruiter", "Recruiter view"],
    ["provider", "Provider view"],
    ["accuracy", "Accuracy"],
    ["how", "How it works"],
  ];
  return (
    <div className="wrap">
      <header>
        <div>
          <div className="brand">Anesthesia Match <span className="poc">POC</span></div>
          <div className="muted small">
            Eligibility-first matching for anesthesia recruiting · {providers.length} providers × {jobs.length} roles ={" "}
            {stats.pairs} pairs → {stats.el} eligible
          </div>
        </div>
        <nav>
          {tabs.map(([v, label]) => (
            <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {view === "recruiter" && <RecruiterView />}
        {view === "provider" && <ProviderView />}
        {view === "accuracy" && <AccuracyView />}
        {view === "how" && <HowView />}
      </main>
      <footer className="muted small">
        Proof of concept built by Space-O Technologies for the Levels.ai engineering role. Fictional sample data.
      </footer>
    </div>
  );
}
