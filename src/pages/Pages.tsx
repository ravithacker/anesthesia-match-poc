import { useMemo, useState } from "react";
import { Icon } from "../ui/icons";
import { Avatar, CheckIcon, Score, SourceBadge, Stat } from "../ui/kit";
import {
  aiByPair, eligibility, fmtDate, generatedAt, jById, jobs, key, labels, money, pById, profById, profiles, providerHealth, providers, STRONG,
} from "../data";

type Open = (providerId: string, jobId?: string) => void;

/* ------------------------------ Candidates ------------------------------ */

export function Candidates({ open }: { open: Open }) {
  const [role, setRole] = useState("All");
  const [src, setSrc] = useState("All");
  const [health, setHealth] = useState("All");
  const channels = Array.from(new Set(profiles.map((p) => p.source.channel)));
  const rows = providers
    .map((p) => ({ p, prof: profById.get(p.id)!, h: providerHealth(p.id), n: eligibility.filter((e) => e.providerId === p.id && e.eligible).length }))
    .filter((r) => (role === "All" || r.p.role === role) && (src === "All" || r.prof.source.channel === src) && (health === "All" || r.h.state === health));

  return (
    <div>
      <div className="filters card">
        <label>Role<select value={role} onChange={(e) => setRole(e.target.value)}>{["All", "CRNA", "Anesthesiologist", "CAA"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Came from<select value={src} onChange={(e) => setSrc(e.target.value)}>{["All", ...channels].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Credentials<select value={health} onChange={(e) => setHealth(e.target.value)}>
          <option value="All">All</option><option value="clear">All clear</option><option value="attention">Action needed</option><option value="blocked">Blocked</option>
        </select></label>
        <span className="muted small">{rows.length} of {providers.length} providers</span>
      </div>
      <div className="card list">
        <div className="list-row list-hdr pool"><span>Provider</span><span>Licences (verified)</span><span>Came from</span><span>Credentials</span><span>Eligible roles</span></div>
        {rows.map(({ p, prof, h, n }) => (
          <button key={p.id} className="list-row pool" onClick={() => open(p.id)}>
            <span className="cand"><Avatar id={p.id} name={p.name} verified={h.state !== "blocked"} /><span><b>{p.name}</b><span className="muted small">{prof.headline.split(" · licensed")[0]}</span></span></span>
            <span className="lic">{prof.verification.licences.map((l) => <span key={l.state} className={`st ${l.status === "Active" ? "" : "st-bad"}`}>{l.state}</span>)}</span>
            <span><SourceBadge channel={prof.source.channel} /></span>
            <span><span className={`health health-${h.state}`}>{h.state === "clear" ? "All clear" : h.state === "attention" ? "Action needed" : "Blocked"}</span>{h.issues[0] && <span className="muted small block">{h.issues[0]}</span>}</span>
            <span className="num">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Live NPI ------------------------------ */

interface NpiResult { npi: string; name: string; credential: string; status: string; updated: string; city: string; taxonomies: { code: string; desc: string; state: string | null; license: string | null; primary: boolean }[] }

function useNpi() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<{ count: number; results: NpiResult[]; queriedAt: string } | null>(null);
  const run = async (qs: string) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/npi?${qs}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lookup failed");
      setData(d);
    } catch (e) {
      setErr((e as Error).message);
      setData(null);
    } finally { setBusy(false); }
  };
  return { busy, err, data, run };
}

function NpiTable({ results, state }: { results: NpiResult[]; state?: string }) {
  return (
    <table className="vtable npi">
      <thead><tr><th>Provider (public registry)</th><th>NPI</th><th>Practice location</th><th>Licence reported to NPPES</th><th>Next step</th></tr></thead>
      <tbody>
        {results.map((r) => {
          const t = r.taxonomies.find((x) => x.primary) ?? r.taxonomies[0];
          const lics = r.taxonomies.filter((x) => x.license).map((x) => `${x.state} ${x.license}`);
          const inState = state ? r.taxonomies.find((x) => x.state === state && x.license) : undefined;
          const mismatch = state && lics.length > 0 && !inState;
          const confirmAt = inState?.state ?? t?.state;
          return (
            <tr key={r.npi}>
              <td><b>{r.name}</b>{r.credential && <span className="muted">, {r.credential}</span>}<div className="muted small">{t?.desc} · updated {r.updated}</div></td>
              <td className="mono">{r.npi}</td>
              <td className="small">{r.city || "—"}</td>
              <td className="small">{lics.length ? Array.from(new Set(lics)).join(", ") : <span className="muted">none listed</span>}{mismatch && <div className="t-warn small">No {state} licence listed</div>}</td>
              <td className="small">{mismatch ? "Ask for a " + state + " licence" : confirmAt ? `Confirm at ${confirmAt} board` : "Ask provider for licence"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------ Verification ------------------------------ */

export function Verification({ open }: { open: Open }) {
  const npi = useNpi();
  const [num, setNum] = useState("");
  const all = providers.map((p) => ({ p, prof: profById.get(p.id)!, h: providerHealth(p.id) }));
  const blocked = all.filter((x) => x.h.state === "blocked");
  const attention = all.filter((x) => x.h.state === "attention");
  const checks = profiles.reduce((n, p) => n + 1 + p.verification.licences.length + p.verification.dea.length + 1 + p.verification.exclusions.length, 0);

  const STEPS = [
    { icon: "id", t: "Identity", s: "NPPES NPI Registry", d: "NPI is active and the taxonomy matches the role (CRNA 367500000X, Anesthesiology 207L00000X, AA 367H00000X)." },
    { icon: "file", t: "State licence", s: "State board of nursing / medical board", d: "Licence number, status, expiry and discipline at the issuing board. NPPES licence fields are self-reported, so they're a lead, not proof." },
    { icon: "pill", t: "DEA", s: "DEA registration validation", d: "Active registration in the job's state, schedules and expiry, where the role needs one." },
    { icon: "award", t: "Board certification", s: "NBCRNA · ABA · NCCAA", d: "Certification status and recertification date at the certifying body." },
    { icon: "ban", t: "Exclusions", s: "HHS-OIG LEIE · SAM.gov", d: "Not barred from federal healthcare programs. Name matches go to a human with date-of-birth comparison." },
  ];

  return (
    <div className="ver">
      <div className="card hero">
        <div>
          <div className="eyebrow">The problem</div>
          <h2>A CV says "active licence". Only the board can say it's true.</h2>
          <p className="muted">
            Anesthesia hiring fails late when a licence has lapsed, a DEA registration is for the wrong state, or certification wasn't renewed.
            We check every credential at its source before a recruiter sees the candidate, store the evidence with a timestamp, and
            re-check before each submission and as expiry dates approach.
          </p>
        </div>
        <div className="hero-stats">
          <Stat value={checks} label="primary-source checks run" icon="shield" />
          <Stat value={blocked.length} label="providers blocked by verification" tone="fail" icon="ban" />
          <Stat value={attention.length} label="need action (e.g. renewal due)" tone="warn" icon="alert" />
        </div>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s.t} className="step card">
            <span className="step-n">{i + 1}</span>
            <span className="step-ic"><Icon name={s.icon} size={18} /></span>
            <b>{s.t}</b>
            <span className="step-src">{s.s}</span>
            <p className="small muted">{s.d}</p>
          </div>
        ))}
      </div>

      <h3 className="h3">Caught before a recruiter saw them</h3>
      <div className="caught-grid">
        {blocked.map(({ p, prof, h }) => (
          <button key={p.id} className="card cg" onClick={() => open(p.id)}>
            <div className="near-top"><Avatar id={p.id} name={p.name} size={36} /><div><b>{p.name}</b><div className="muted small">{prof.headline.split(" · licensed")[0]}</div></div></div>
            <div className="vs">
              <div><span className="lbl">Profile says</span><CheckIcon pass /> Credentials current</div>
              <div><span className="lbl">Source says</span><CheckIcon pass={false} /> {h.issues[0]}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="card live">
        <div className="live-h">
          <span className="live-dot" /> <b>Live check against the real NPI Registry</b>
          <span className="muted small">Public CMS data, queried now. Try any 10-digit NPI.</span>
        </div>
        <form className="live-form" onSubmit={(e) => { e.preventDefault(); npi.run(`number=${encodeURIComponent(num.trim())}`); }}>
          <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Enter an NPI, e.g. from the Sourcing tab" inputMode="numeric" />
          <button className="btn" disabled={npi.busy || !/^\d{10}$/.test(num.trim())}>{npi.busy ? "Checking…" : "Verify NPI"}</button>
        </form>
        {npi.err && <p className="t-fail small">{npi.err}</p>}
        {npi.data && (npi.data.results.length ? <NpiTable results={npi.data.results} /> : <p className="muted">No provider with that NPI.</p>)}
        <p className="muted small">
          Next in production: the licence number from NPPES is confirmed at the state board (status, expiry, discipline), then DEA, certification
          and exclusion lists, through a credential-verification API or direct board lookups. Results are stored as evidence with the time checked.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Sourcing ------------------------------ */

const STATES = ["GA", "IL", "AZ", "FL", "MT", "WA", "OH", "TX", "CA", "NY", "CO", "NC"];

export function Sourcing() {
  const npi = useNpi();
  const [tax, setTax] = useState("crna");
  const [state, setState] = useState("GA");
  const [city, setCity] = useState("");
  const mix = useMemo(() => {
    const m = new Map<string, { n: number; eligible: number }>();
    for (const p of profiles) {
      const r = m.get(p.source.channel) ?? { n: 0, eligible: 0 };
      r.n++;
      if (eligibility.some((e) => e.providerId === p.providerId && e.eligible)) r.eligible++;
      m.set(p.source.channel, r);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].n - a[1].n);
  }, []);
  const max = Math.max(...mix.map(([, v]) => v.n));

  return (
    <div>
      <div className="card">
        <div className="eyebrow">Where candidates come from</div>
        <h2>Five channels feed one verified pool</h2>
        <div className="mix">
          {mix.map(([ch, v]) => (
            <div key={ch} className="mix-row">
              <SourceBadge channel={ch} />
              <span className="bar big"><i className="bar-all" style={{ width: `${(v.n / max) * 100}%` }} /><i className="bar-in" style={{ width: `${(v.eligible / max) * 100}%` }} /></span>
              <span className="small"><b>{v.n}</b> providers · {v.eligible} eligible for a live role</span>
            </div>
          ))}
        </div>
        <div className="legend small"><span><i className="lg-all" />Providers sourced</span><span><i className="lg-in" />Eligible for a live role</span></div>
        <p className="muted small">Tracking eligible-per-channel, not just volume, tells Levels.ai where to spend outreach budget.</p>
      </div>

      <div className="card live">
        <div className="live-h">
          <span className="live-dot" /> <b>Live sourcing: search the national NPI Registry</b>
          <span className="muted small">Every practising anesthesia provider in the US has an NPI. This is a free, public top of funnel.</span>
        </div>
        <form className="live-form" onSubmit={(e) => { e.preventDefault(); npi.run(new URLSearchParams({ taxonomy: tax, state, ...(city ? { city } : {}) }).toString()); }}>
          <select value={tax} onChange={(e) => setTax(e.target.value)}>
            <option value="crna">CRNA (367500000X)</option>
            <option value="anesthesiology">Anesthesiology (207L00000X)</option>
            <option value="aa">Anesthesiologist Assistant (367H00000X)</option>
          </select>
          <select value={state} onChange={(e) => setState(e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" />
          <button className="btn" disabled={npi.busy}>{npi.busy ? "Searching…" : "Search registry"}</button>
        </form>
        {npi.err && <p className="t-fail small">{npi.err}</p>}
        {npi.data && (
          <>
            <p className="small">
              <b>{npi.data.count}</b> results shown (the registry caps a single query, so production pages through by city).
              Queried {new Date(npi.data.queriedAt).toLocaleTimeString()}.
            </p>
            <div className="callout">
              <Icon name="info" size={15} />
              <span>
                Notice how often the licence on file is for a different state than the search, or missing. The registry matches any address and
                licence fields are self-reported. It's a sourcing lead, never proof of eligibility. That's what the Verification step is for.
              </span>
            </div>
            <NpiTable results={npi.data.results.slice(0, 25)} state={state} />
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Accuracy ------------------------------ */

export function Accuracy({ open }: { open: Open }) {
  const pairs = labels.map((l) => {
    const m = aiByPair.get(key(l.providerId, l.jobId))!;
    const ai = m.score >= STRONG ? "good" : "weak";
    return { l, m, ai, agree: ai === l.label };
  });
  const agree = pairs.filter((x) => x.agree).length;
  const cell = (a: string, b: string) => pairs.filter((x) => x.ai === a && x.l.label === b).length;
  const dis = pairs.filter((x) => !x.agree);
  return (
    <div>
      <div className="card acc">
        <div>
          <div className="eyebrow">Evaluation</div>
          <h2>Does the AI agree with a recruiter?</h2>
          <p className="muted">
            Every eligible pair is also graded by a recruiter checklist (location or relocation, pay inside the range, call fit), written
            separately from the AI prompt. The AI's call is "good" at {STRONG}+. In the paid trial, your recruiters grade real pairs instead,
            and this screen becomes the release gate for any prompt or model change.
          </p>
        </div>
        <div className="acc-right">
          <Stat value={`${Math.round((agree / pairs.length) * 100)}%`} label={`agreement on ${pairs.length} pairs`} tone="ok" icon="checkCircle" />
          <table className="cm">
            <thead><tr><th></th><th>Recruiter: good</th><th>Recruiter: weak</th></tr></thead>
            <tbody>
              <tr><th>AI: good</th><td className="ok">{cell("good", "good")}</td><td className="bad">{cell("good", "weak")}</td></tr>
              <tr><th>AI: weak</th><td className="bad">{cell("weak", "good")}</td><td className="ok">{cell("weak", "weak")}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <h3 className="h3">The {dis.length} disagreements, and what they teach us</h3>
      {dis.map(({ l, m, ai }) => {
        const p = pById.get(l.providerId)!;
        const j = jById.get(l.jobId)!;
        return (
          <button key={key(l.providerId, l.jobId)} className="card dis" onClick={() => open(p.id, j.id)}>
            <Avatar id={p.id} name={p.name} size={34} />
            <div className="dis-main">
              <b>{p.name}</b> <span className="muted">→ {j.title}, {j.city}</span>
              <div className="dis-cmp">
                <span><span className={`vr ${l.label === "good" ? "vr-ok" : "vr-warn"}`}>Checklist: {l.label}</span> {l.why}</span>
                <span><span className={`vr ${ai === "good" ? "vr-ok" : "vr-warn"}`}>AI: {ai}</span> {m.recruiterReason}</span>
              </div>
            </div>
            <Score score={m.score} />
          </button>
        );
      })}
      <p className="hint"><Icon name="info" size={14} /> Pattern: the AI forgives pay a few dollars over the top of range when everything else fits. A strict checklist doesn't. Which one is right is a business decision, and this is where Levels.ai would make it.</p>
    </div>
  );
}

/* ------------------------------ Provider app ------------------------------ */

export function ProviderApp() {
  const [pid, setPid] = useState("P01");
  const p = pById.get(pid)!;
  const prof = profById.get(pid)!;
  const rows = eligibility.filter((e) => e.providerId === pid);
  const fits = rows.filter((e) => e.eligible).map((e) => ({ j: jById.get(e.jobId)!, m: aiByPair.get(key(pid, e.jobId))! })).sort((a, b) => b.m.score - a.m.score);
  const close = rows.filter((e) => !e.eligible && e.checks.filter((c) => !c.pass).length === 1);
  return (
    <div className="papp">
      <div className="card papp-side">
        <div className="eyebrow">Provider side of the marketplace</div>
        <h2>Same match, explained to the provider</h2>
        <p className="muted">Providers see only roles they can actually take, why each one suits them, and the one thing that would unlock a near-miss.</p>
        <label className="small muted">View as</label>
        <select value={pid} onChange={(e) => setPid(e.target.value)}>
          {providers.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.role} · {x.licenses.join("/")}</option>)}
        </select>
        <div className="papp-points">
          <div><Icon name="shield" size={18} /><span><b>Only roles they can take.</b> Verified licence, DEA and certification are matched against each role before it's shown.</span></div>
          <div><Icon name="sparkles" size={18} /><span><b>A reason written for them.</b> The same AI pass writes one line for the hiring team and one for the provider.</span></div>
          <div><Icon name="alert" size={18} /><span><b>What would unlock more.</b> Near-misses show the single missing item, e.g. a licence in another state. That's also a re-engagement hook.</span></div>
          <div><Icon name="calendar" size={18} /><span><b>Expiry reminders.</b> Licence and DEA renewal dates come from the verified record, so the app can remind them before a role is at risk.</span></div>
        </div>
      </div>
      <div className="phone">
        <div className="phone-notch" />
        <div className="ph-screen">
          <div className="ph-top">
            <Avatar id={p.id} name={p.name} size={34} verified />
            <div><b>Hi {p.name.split(" ")[0]}</b><div className="small muted">{prof.verification.licences.filter((l) => l.status === "Active").length} licences verified</div></div>
          </div>
          <div className="ph-h">Roles for you <span>{fits.length}</span></div>
          {fits.length === 0 && <div className="ph-empty">No roles match every requirement yet.</div>}
          {fits.map(({ j, m }) => (
            <div key={j.id} className="ph-card">
              <div className="ph-row"><b>{j.title}</b><Score score={m.score} size={34} /></div>
              <div className="small muted">{j.facility} · {j.city}, {j.state}</div>
              <div className="ph-pay">{money(j)} · {j.contract}</div>
              <p>{m.providerPitch}</p>
            </div>
          ))}
          {close.length > 0 && <div className="ph-h">One step away</div>}
          {close.map((e) => {
            const j = jById.get(e.jobId)!;
            const c = e.checks.find((x) => !x.pass)!;
            return (
              <div key={j.id} className="ph-card ph-close">
                <b>{j.title}</b>
                <div className="small muted">{j.city}, {j.state}</div>
                <p className="t-warn small"><Icon name="alert" size={12} /> {c.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ How it works ------------------------------ */

export function How() {
  const flow = [
    { icon: "inbox", t: "Source", d: "Applications, referrals, NPI-registry outreach, job boards, facility ATS imports" },
    { icon: "file", t: "Structure", d: "CV + case log parsed into a structured profile (LLM extraction, recruiter-confirmable)" },
    { icon: "shield", t: "Verify", d: "NPI, state licence, DEA, board, exclusions at primary source, with evidence + timestamps" },
    { icon: "layers", t: "Filter", d: "JD requirements become hard rules: SQL over verified fields. Every rejection has a reason" },
    { icon: "sparkles", t: "Rank", d: "LLM scores soft fit on eligible pairs only; reason for each side. Names never sent" },
    { icon: "chart", t: "Evaluate", d: "Recruiter-labelled pairs gate every prompt/model change" },
  ];
  return (
    <div>
      <div className="card">
        <div className="eyebrow">Architecture</div>
        <h2>Eligibility first, AI second, humans as the benchmark</h2>
        <div className="flow">
          {flow.map((f, i) => (
            <div key={f.t} className="flow-step">
              <span className="flow-ic"><Icon name={f.icon} size={20} /></span>
              <b>{f.t}</b>
              <span className="small muted">{f.d}</span>
              {i < flow.length - 1 && <Icon name="arrowRight" size={16} className="flow-arrow" />}
            </div>
          ))}
        </div>
      </div>
      <div className="two">
        <div className="card">
          <h3 className="h3">Why this order</h3>
          <ul className="bul">
            <li>Eligibility in anesthesia is legal, not a preference. It must be deterministic, auditable and never "talked around" by a model.</li>
            <li>Ranking only eligible pairs keeps LLM cost and latency small, and every score is explainable.</li>
            <li>Verification evidence doubles as a head start on the facility's own credentialing, the slowest step in placement.</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="h3">Production stack (proposed)</h3>
          <ul className="bul">
            <li>PostgreSQL + pgvector: rules as indexed filters, embeddings to retrieve before the LLM ranks the top N.</li>
            <li>Python (FastAPI) workers for verification and parsing; TypeScript/React front end.</li>
            <li>Rules table per state and facility (credentialing lead times, AA practice, supervision models), reviewed by compliance.</li>
            <li>Azure-ready: Azure OpenAI or another provider behind one interface; PII redacted from prompts and logs.</li>
          </ul>
        </div>
      </div>
      <p className="muted small foot-note">
        Demo data: every provider, facility, licence and NPI shown on the Roles, Candidates and Provider pages is fictional, and verification results
        there are simulated. The live NPI lookups query the real public CMS registry. AI rankings were generated with Gemini Flash models on{" "}
        {generatedAt.slice(0, 10)}. Rule values are illustrative.
      </p>
    </div>
  );
}
