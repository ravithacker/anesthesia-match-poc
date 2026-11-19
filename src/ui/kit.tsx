import type { ReactNode } from "react";
import { Icon } from "./icons";
import { grad, initials, STRONG, type CredState } from "../data";

export function Avatar({ id, name, size = 38, verified }: { id: string; name: string; size?: number; verified?: boolean }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: grad(id), fontSize: size * 0.36 }}>
      {initials(name)}
      {verified && (
        <span className="avatar-tick">
          <Icon name="check" size={9} />
        </span>
      )}
    </span>
  );
}

export function Score({ score, size = 44 }: { score: number; size?: number }) {
  const tone = score >= STRONG ? "good" : score >= 50 ? "mid" : "low";
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={`score score-${tone}`} style={{ width: size, height: size }} title={`AI soft-fit ${score}/100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="score-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="score-arc"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <b>{score}</b>
    </span>
  );
}

const CRED_ICON: Record<string, string> = {
  "State licence": "id",
  "DEA registration": "pill",
  "Board certification": "award",
  "Exclusion screening": "ban",
};
const SHORT: Record<string, string> = {
  "State licence": "Licence",
  "DEA registration": "DEA",
  "Board certification": "Board",
  "Exclusion screening": "Exclusions",
};

export function CredChips({ cred }: { cred: Record<string, CredState> }) {
  return (
    <span className="cred-row">
      {Object.entries(cred).map(([rule, st]) => (
        <span key={rule} className={`cred cred-${st}`} title={`${rule}: ${st === "ok" ? "verified" : st === "warn" ? "verified, action needed" : st === "fail" ? "failed" : "not required"}`}>
          <Icon name={CRED_ICON[rule]} size={13} />
          {SHORT[rule]}
        </span>
      ))}
    </span>
  );
}

const SRC_ICON: Record<string, string> = {
  "Applied on Levels.ai": "inbox",
  "NPI registry sourcing": "radar",
  Referral: "heart",
  "Anesthesia job board": "briefcase",
  "Facility ATS import": "building",
};
export function SourceBadge({ channel }: { channel: string }) {
  return (
    <span className="src">
      <Icon name={SRC_ICON[channel] ?? "link"} size={13} />
      {channel}
    </span>
  );
}

export function CheckIcon({ pass, warn }: { pass: boolean; warn?: boolean }) {
  return pass ? (
    warn ? <Icon name="alert" size={16} className="t-warn" /> : <Icon name="checkCircle" size={16} className="t-ok" />
  ) : (
    <Icon name="xCircle" size={16} className="t-fail" />
  );
}

export function Section({ title, icon, children, aside }: { title: string; icon?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="sec">
      <div className="sec-h">
        <h4>
          {icon && <Icon name={icon} size={15} />}
          {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Stat({ value, label, tone, icon }: { value: ReactNode; label: string; tone?: string; icon?: string }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
      {icon && (
        <span className="stat-ic">
          <Icon name={icon} size={17} />
        </span>
      )}
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}
