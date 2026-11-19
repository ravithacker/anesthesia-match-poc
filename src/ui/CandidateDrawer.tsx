import { useEffect } from "react";
import { Icon } from "./icons";
import { Avatar, CheckIcon, Score, Section, SourceBadge } from "./kit";
import { aiByPair, eligByPair, fmtDate, jById, key, pById, profById, providerHealth } from "../data";
import type { CaseType } from "../lib/types";

const CASE_LABEL: Record<CaseType, string> = { general: "General", cardiac: "Cardiac", pediatric: "Pediatric", obstetric: "Obstetric", regional: "Regional", trauma: "Trauma" };

export function CandidateDrawer({ providerId, jobId, onClose }: { providerId: string; jobId?: string; onClose: () => void }) {
  const p = pById.get(providerId)!;
  const prof = profById.get(providerId)!;
  const v = prof.verification;
  const job = jobId ? jById.get(jobId) : undefined;
  const elig = jobId ? eligByPair.get(key(providerId, jobId)) : undefined;
  const ai = jobId ? aiByPair.get(key(providerId, jobId)) : undefined;
  const health = providerHealth(providerId);
  const maxCases = Math.max(...Object.values(prof.caseLog).map((n) => n ?? 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${p.name} profile`}>
        <header className="dr-head">
          <Avatar id={p.id} name={p.name} size={60} verified={health.state !== "blocked"} />
          <div className="dr-id">
            <h2>{p.name}</h2>
            <div className="muted">{prof.headline}</div>
            <div className="dr-meta">
              <span><Icon name="pin" size={13} /> {prof.homeCity}</span>
              <span><Icon name="id" size={13} /> NPI {v.npi}</span>
              <SourceBadge channel={prof.source.channel} />
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>

        <div className="dr-body">
          {job && elig && (
            <div className={`match-card ${elig.eligible ? "" : "match-blocked"}`}>
              <div className="match-top">
                <div>
                  <div className="eyebrow">Match for</div>
                  <div className="match-job">{job.title}</div>
                  <div className="muted small">{job.facility} · {job.city}, {job.state}</div>
                </div>
                {elig.eligible && ai ? <Score score={ai.score} size={58} /> : <span className="blocked-pill"><Icon name="ban" size={14} /> Not eligible</span>}
              </div>
              {elig.eligible && ai && (
                <div className="match-why">
                  <div><span className="lbl">For the hiring team</span>{ai.recruiterReason}</div>
                  <div><span className="lbl">What we'd tell {p.name.split(" ")[0]}</span>{ai.providerPitch}</div>
                  {ai.concerns.length > 0 && (
                    <div className="chips">{ai.concerns.map((c) => <span key={c} className="chip chip-warn">{c}</span>)}</div>
                  )}
                </div>
              )}
              <table className="rules">
                <tbody>
                  {elig.checks.map((c) => (
                    <tr key={c.rule} className={!c.pass ? "row-fail" : c.warn ? "row-warn" : ""}>
                      <td className="ic"><CheckIcon pass={c.pass} warn={!!c.warn} /></td>
                      <td className="rn">{c.rule}</td>
                      <td>
                        {c.detail}
                        {c.warn && <div className="t-warn small">{c.warn}</div>}
                      </td>
                      <td className="src-cell">{c.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Section title="Verification report" icon="shield" aside={<span className={`health health-${health.state}`}>{health.state === "clear" ? "All clear" : health.state === "attention" ? "Action needed" : "Blocked"}</span>}>
            <p className="muted small sec-note">
              Each credential is checked at the issuing source, not taken from the CV. Re-checked automatically before every submission and
              when a licence nears expiry.
            </p>
            <table className="vtable">
              <thead>
                <tr><th>Credential</th><th>Result</th><th>Source</th><th>Checked</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>NPI</b><div className="muted small">{v.npi} · {v.taxonomy}</div></td>
                  <td><span className="vr vr-ok">Active</span></td>
                  <td className="small">{v.npiSource}</td>
                  <td className="small muted">{v.npiCheckedAt}</td>
                </tr>
                {v.licences.map((l) => (
                  <tr key={l.state} className={l.status !== "Active" ? "row-fail" : ""}>
                    <td>
                      <b>{l.state} licence</b>
                      <div className="muted small">{l.type} · {l.number} · exp {l.expires}</div>
                      {l.status !== "Active" && l.selfReported && <div className="t-fail small">Profile says active. Board record says {l.status.toLowerCase()}.</div>}
                    </td>
                    <td><span className={`vr ${l.status === "Active" ? "vr-ok" : "vr-fail"}`}>{l.status}</span><div className="muted small">Discipline: {l.discipline}</div></td>
                    <td className="small">{l.source}</td>
                    <td className="small muted">{l.checkedAt}</td>
                  </tr>
                ))}
                {v.dea.map((d) => (
                  <tr key={d.state} className={d.status !== "Active" ? "row-fail" : ""}>
                    <td><b>{d.state} DEA</b><div className="muted small">{d.number} · schedules {d.schedules} · exp {d.expires}</div></td>
                    <td><span className={`vr ${d.status === "Active" ? "vr-ok" : "vr-fail"}`}>{d.status}</span></td>
                    <td className="small">{d.source}</td>
                    <td className="small muted">{d.checkedAt}</td>
                  </tr>
                ))}
                <tr className={v.board.status === "Lapsed" ? "row-fail" : ""}>
                  <td><b>{v.board.body}</b><div className="muted small">{v.board.credential}{v.board.status !== "Eligible" ? ` · through ${v.board.validThrough}` : ""}</div></td>
                  <td><span className={`vr ${v.board.status === "Active" ? "vr-ok" : v.board.status === "Eligible" ? "vr-warn" : "vr-fail"}`}>{v.board.status}</span></td>
                  <td className="small">{v.board.source}</td>
                  <td className="small muted">{v.board.checkedAt}</td>
                </tr>
                {v.exclusions.map((e) => (
                  <tr key={e.list} className={e.result !== "Clear" ? "row-warn" : ""}>
                    <td><b>{e.list}</b><div className="muted small">{e.detail}</div></td>
                    <td><span className={`vr ${e.result === "Clear" ? "vr-ok" : "vr-warn"}`}>{e.result}</span></td>
                    <td className="small">{e.list === "OIG LEIE" ? "HHS-OIG exclusion list" : "SAM.gov exclusions"}</td>
                    <td className="small muted">{e.checkedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="How they came to us" icon="link">
            <div className="src-box">
              <SourceBadge channel={prof.source.channel} />
              <span>{prof.source.detail}</span>
            </div>
            <ol className="journey">
              {prof.journey.map((j, i) => (
                <li key={i}><span className="jdot" /><span className="jdate">{fmtDate(j.date)}</span>{j.event}</li>
              ))}
            </ol>
          </Section>

          <Section title="Experience" icon="briefcase">
            <div className="timeline">
              {prof.experience.map((x, i) => (
                <div key={i} className="tl-item">
                  <div className="tl-years">{x.from} – {x.to}</div>
                  <div>
                    <div className="tl-title">{x.title}</div>
                    <div className="muted small">{x.org} · {x.location}</div>
                    <ul>{x.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="two">
            <Section title="Education & training" icon="cap">
              {prof.education.map((e) => (
                <div key={e.degree} className="edu">
                  <b>{e.degree}</b>
                  <div className="muted small">{e.school} · {e.years}</div>
                </div>
              ))}
            </Section>
            <Section title="Case log" icon="activity" aside={<span className="muted small">self-reported, attested</span>}>
              {Object.entries(prof.caseLog).map(([c, n]) => (
                <div key={c} className="bar-row">
                  <span>{CASE_LABEL[c as CaseType]}</span>
                  <span className="bar"><i style={{ width: `${((n ?? 0) / maxCases) * 100}%` }} /></span>
                  <b>{(n ?? 0).toLocaleString()}</b>
                </div>
              ))}
            </Section>
          </div>

          <Section title="Skills" icon="sparkles">
            <div className="chips">{prof.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </Section>

          <Section title="Preferences" icon="heart">
            <div className="prefs">
              <div><span>Contract</span>{p.acceptsContracts.join(" / ")}</div>
              <div><span>Minimum pay</span>{[p.minAnnualPay && `$${(p.minAnnualPay / 1000).toFixed(0)}K/yr`, p.minHourlyPay && `$${p.minHourlyPay}/hr`].filter(Boolean).join(" · ")}</div>
              <div><span>Call</span>{p.takesCall ? "Takes call" : "Prefers no call"}</div>
              <div><span>Location</span>{p.preferredStates.join(", ")}{p.openToRelocation ? " · open to relocating" : ""}</div>
              <div><span>Available</span>{fmtDate(p.availableFrom)}</div>
              <div><span>Credentialing packet</span>{p.credentialingDocsReady ? "Complete" : "Missing items"}</div>
            </div>
            <p className="quote">"{p.bio}"</p>
          </Section>

          <Section title="Attestations" icon="file">
            <div className="prefs">
              <div><span>Malpractice</span>{prof.malpractice}</div>
              <div><span>References</span>{prof.references}</div>
            </div>
          </Section>
        </div>
      </aside>
    </div>
  );
}
