import { useState } from "react";
import { Icon } from "../ui/icons";
import { Avatar, CheckIcon, CredChips, Score, SourceBadge } from "../ui/kit";
import { aiByPair, credSummary, eligibility, fmtDate, jdById, jById, jobs, key, money, pById, profById, STRONG } from "../data";
import type { PairEligibility } from "../lib/types";

type Tab = "shortlist" | "jd" | "rules" | "rejected";

const STAGES: { label: string; rules: string[] }[] = [
  { label: "In talent pool", rules: [] },
  { label: "Right role", rules: ["Role"] },
  { label: "Licence verified in state", rules: ["State licence"] },
  { label: "DEA, board, exclusions clear", rules: ["DEA registration", "Board certification", "Exclusion screening"] },
  { label: "Case mix & experience", rules: ["Case mix", "Experience"] },
  { label: "Contract & start date", rules: ["Contract type", "Start date"] },
];

function funnel(rows: PairEligibility[]) {
  const passed: string[] = [];
  return STAGES.map((s) => {
    passed.push(...s.rules);
    return { label: s.label, n: rows.filter((r) => r.checks.every((c) => !passed.includes(c.rule) || c.pass)).length };
  });
}

/** Self-reported says yes, verified record says no: the cases verification exists for. */
const VERIFY_FAIL = /EXPIRED|although the profile|Lapsed|possible match|Held for manual review/i;
const caughtByVerification = (e: PairEligibility) => {
  const fails = e.checks.filter((c) => !c.pass);
  return fails.length > 0 && fails.every((c) => VERIFY_FAIL.test(c.detail));
};

export function Roles({ open }: { open: (providerId: string, jobId?: string) => void }) {
  const [jobId, setJobId] = useState(jobs[0].id);
  const [tab, setTab] = useState<Tab>("shortlist");
  const job = jById.get(jobId)!;
  const jd = jdById.get(jobId)!;
  const rows = eligibility.filter((e) => e.jobId === jobId);
  const eligible = rows
    .filter((e) => e.eligible)
    .map((e) => ({ e, p: pById.get(e.providerId)!, prof: profById.get(e.providerId)!, m: aiByPair.get(key(e.providerId, jobId))! }))
    .sort((a, b) => b.m.score - a.m.score);
  const notEligible = rows.filter((e) => !e.eligible);
  const near = notEligible.filter((e) => e.checks.filter((c) => !c.pass).length === 1).sort((a, b) => Number(caughtByVerification(b)) - Number(caughtByVerification(a)));
  const byRule = new Map<string, number>();
  for (const e of notEligible) for (const c of e.checks) if (!c.pass) byRule.set(c.rule, (byRule.get(c.rule) ?? 0) + 1);
  const ruleCounts = Array.from(byRule.entries()).sort((a, b) => b[1] - a[1]);
  const f = funnel(rows);

  return (
    <div className="roles">
      <aside className="role-list">
        <div className="list-h">Open roles <span className="count">{jobs.length}</span></div>
        {jobs.map((j) => {
          const n = eligibility.filter((e) => e.jobId === j.id && e.eligible).length;
          const strong = eligibility.filter((e) => e.jobId === j.id && e.eligible && (aiByPair.get(key(e.providerId, j.id))?.score ?? 0) >= STRONG).length;
          return (
            <button key={j.id} className={`role-item ${j.id === jobId ? "on" : ""}`} onClick={() => { setJobId(j.id); setTab("shortlist"); }}>
              <span className="fac">{j.facility.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              <span className="ri-main">
                <span className="ri-t">{j.title}</span>
                <span className="ri-s">{j.city}, {j.state} · {j.contract}</span>
              </span>
              <span className="ri-n"><b>{n}</b><i>{strong} strong</i></span>
            </button>
          );
        })}
      </aside>

      <div className="role-main">
        <div className="card role-head">
          <div className="rh-top">
            <span className="fac fac-lg">{job.facility.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
            <div className="rh-id">
              <h1>{job.title}</h1>
              <div className="muted">{job.facility} · {job.careModel}</div>
            </div>
          </div>
          <div className="facts">
            <span><Icon name="pin" size={15} />{job.city}, {job.state}</span>
            <span><Icon name="dollar" size={15} />{money(job)}</span>
            <span><Icon name="briefcase" size={15} />{job.contract}</span>
            <span><Icon name="calendar" size={15} />Starts {fmtDate(job.startDate)}</span>
            <span><Icon name="clock" size={15} />{job.callRequired ? "Call required" : "No call"}</span>
          </div>
          <nav className="tabs">
            {([
              ["shortlist", `Shortlist (${eligible.length})`],
              ["jd", "Job description"],
              ["rules", "Requirements → rules"],
              ["rejected", `Not eligible (${rows.length - eligible.length})`],
            ] as [Tab, string][]).map(([t, l]) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{l}</button>
            ))}
          </nav>
        </div>

        {tab === "shortlist" && (
          <>
            <div className="card funnel">
              {f.map((s, i) => (
                <div key={s.label} className="fn-step">
                  <div className="fn-bar"><i style={{ height: `${Math.max(6, (s.n / f[0].n) * 100)}%` }} /></div>
                  <b>{s.n}</b>
                  <span>{s.label}</span>
                  {i < f.length - 1 && <Icon name="chevron" size={14} className="fn-arrow" />}
                </div>
              ))}
              <div className="fn-step fn-ai">
                <div className="fn-bar"><i style={{ height: `${Math.max(6, (eligible.filter((x) => x.m.score >= STRONG).length / f[0].n) * 100)}%` }} /></div>
                <b>{eligible.filter((x) => x.m.score >= STRONG).length}</b>
                <span>AI: call this week</span>
              </div>
            </div>

            <div className="card list">
              <div className="list-row list-hdr">
                <span>Candidate</span><span>Came from</span><span>Credentials (verified)</span><span>AI fit</span>
              </div>
              {eligible.map(({ p, prof, m, e }) => {
                const warn = e.checks.find((c) => c.warn);
                return (
                  <button key={p.id} className="list-row" onClick={() => open(p.id, jobId)}>
                    <span className="cand">
                      <Avatar id={p.id} name={p.name} verified />
                      <span>
                        <b>{p.name}</b>
                        <span className="muted small">{prof.headline}</span>
                        <span className="reason">{m.recruiterReason}</span>
                        {warn && <span className="chip chip-warn"><Icon name="alert" size={12} /> {warn.warn}</span>}
                      </span>
                    </span>
                    <span><SourceBadge channel={prof.source.channel} /></span>
                    <span><CredChips cred={credSummary(e.checks)} /></span>
                    <span className="fit"><Score score={m.score} /><Icon name="chevron" size={16} className="muted" /></span>
                  </button>
                );
              })}
            </div>
            <p className="hint"><Icon name="info" size={14} /> Click a candidate for the full CV, verification report and how they reached us.</p>
          </>
        )}

        {tab === "jd" && (
          <article className="card jd">
            <div className="jd-meta">
              <span><Icon name="building" size={14} /> {jd.postedBy}</span>
              <span><Icon name="calendar" size={14} /> Posted {fmtDate(jd.postedAt)}</span>
            </div>
            <h3>About the role</h3>
            <p>{jd.about}</p>
            <h3>What you'll do</h3>
            <ul>{jd.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
            <h3>Requirements</h3>
            <ul className="req">
              {jd.requirements.map((r) => (
                <li key={r.text}>
                  <span>{r.text}</span>
                  <span className={`rule-tag ${r.rule === "Advisory" ? "rule-adv" : ""}`}>{r.rule === "Advisory" ? "advisory, not a hard rule" : `→ ${r.rule}`}</span>
                </li>
              ))}
            </ul>
            <h3>Nice to have</h3>
            <ul>{jd.niceToHave.map((r) => <li key={r}>{r}</li>)}</ul>
            <div className="jd-grid">
              <div><h3>Schedule</h3><p>{jd.schedule}</p></div>
              <div><h3>Compensation & benefits</h3><ul>{jd.benefits.map((b) => <li key={b}>{b}</li>)}</ul></div>
            </div>
          </article>
        )}

        {tab === "rules" && (
          <div className="card">
            <p className="muted lead">
              Every hard requirement in the JD becomes a rule with a named source of truth. In production an LLM drafts this mapping from the
              JD text and a recruiter confirms it before the role goes live. Soft preferences go to the AI ranking instead.
            </p>
            <table className="rtable">
              <thead><tr><th>Requirement in the JD</th><th>Hard rule</th><th>Checked against</th><th>Pool passing</th></tr></thead>
              <tbody>
                {jd.requirements.map((r) => {
                  const pass = rows.filter((e) => e.checks.find((c) => c.rule === r.rule)?.pass).length;
                  return (
                    <tr key={r.text}>
                      <td>{r.text}</td>
                      <td>{r.rule === "Advisory" ? <span className="muted">advisory</span> : <span className="rule-tag">{r.rule}</span>}</td>
                      <td className="small">{r.verifiedBy}</td>
                      <td>
                        {r.rule !== "Advisory" && (
                          <span className="pp"><span className="bar"><i style={{ width: `${(pass / rows.length) * 100}%` }} /></span>{pass}/{rows.length}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "rejected" && (
          <>
            <div className="card">
              <div className="eyebrow">Why {notEligible.length} providers never reached this shortlist</div>
              <div className="why-grid">
                {ruleCounts.map(([r, n]) => (
                  <div key={r} className="why-row">
                    <span>{r}</span>
                    <span className="bar"><i style={{ width: `${(n / notEligible.length) * 100}%` }} /></span>
                    <b>{n}</b>
                  </div>
                ))}
              </div>
              <p className="muted small">A provider can fail more than one rule. Below: the {near.length} who failed exactly one, so a recruiter can see who is one fix away. Red cards would have passed on their self-reported profile.</p>
            </div>
            {near.map((e) => {
              const p = pById.get(e.providerId)!;
              const prof = profById.get(e.providerId)!;
              const caught = caughtByVerification(e);
              return (
                <button key={p.id} className={`card near ${caught ? "near-caught" : ""}`} onClick={() => open(p.id, jobId)}>
                  {caught && <div className="caught"><Icon name="shield" size={14} /> Caught by verification: the profile alone looked eligible</div>}
                  <div className="near-top">
                    <Avatar id={p.id} name={p.name} size={34} />
                    <div><b>{p.name}</b><div className="muted small">{prof.headline}</div></div>
                  </div>
                  <ul className="fails">
                    {e.checks.filter((c) => !c.pass).map((c) => (
                      <li key={c.rule}><CheckIcon pass={false} /><span><b>{c.rule}.</b> {c.detail}{c.source && <span className="muted"> · {c.source}</span>}</span></li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
