import { useCallback, useState } from "react";
import { Icon } from "./ui/icons";
import { CandidateDrawer } from "./ui/CandidateDrawer";
import { Roles } from "./pages/Roles";
import { Accuracy, Candidates, How, ProviderApp, Sourcing, Verification } from "./pages/Pages";
import { eligibility, jobs, providerHealth, providers } from "./data";

type View = "roles" | "candidates" | "verification" | "sourcing" | "accuracy" | "provider" | "how";

const NAV: { v: View; label: string; icon: string; sub: string }[] = [
  { v: "roles", label: "Roles & shortlists", icon: "briefcase", sub: "Recruiter workspace" },
  { v: "candidates", label: "Talent pool", icon: "users", sub: "All providers" },
  { v: "verification", label: "Verification", icon: "shield", sub: "Primary-source checks" },
  { v: "sourcing", label: "Sourcing", icon: "radar", sub: "Live NPI Registry" },
  { v: "accuracy", label: "AI accuracy", icon: "chart", sub: "Eval vs recruiters" },
  { v: "provider", label: "Provider app", icon: "phone", sub: "Two-sided view" },
  { v: "how", label: "How it works", icon: "layers", sub: "Architecture" },
];

const TITLES: Record<View, [string, string]> = {
  roles: ["Roles & shortlists", "Pick a role: verified, eligible candidates ranked by AI, with the JD and every rule behind it."],
  candidates: ["Talent pool", "Every provider, where they came from, and the state of their verified credentials."],
  verification: ["Credential verification", "What we check, where we check it, and what it caught."],
  sourcing: ["Sourcing", "Channel mix, plus a live search of the national NPI Registry."],
  accuracy: ["AI accuracy", "How often the AI ranking agrees with a recruiter, and where it doesn't."],
  provider: ["Provider app", "The provider's side of the same match."],
  how: ["How it works", "Pipeline, design choices and proposed production stack."],
};

export default function App() {
  const [view, setView] = useState<View>("roles");
  const [drawer, setDrawer] = useState<{ p: string; j?: string } | null>(null);
  const open = useCallback((p: string, j?: string) => setDrawer({ p, j }), []);
  const close = useCallback(() => setDrawer(null), []);
  const eligibleCount = eligibility.filter((e) => e.eligible).length;
  const blocked = providers.filter((p) => providerHealth(p.id).state === "blocked").length;

  return (
    <div className="shell">
      <aside className="side">
        <div className="logo">
          <span className="logo-mark">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2.5-6 5 12 2.5-6h4" /></svg>
          </span>
          <div>
            <b>Anesthesia Match</b>
            <span>Proof of concept for Levels.ai</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.v} className={view === n.v ? "on" : ""} onClick={() => setView(n.v)}>
              <Icon name={n.icon} size={18} />
              <span><b>{n.label}</b><i>{n.sub}</i></span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="demo-note"><Icon name="info" size={14} /> Fictional providers and facilities. Live NPI lookups use real public CMS data.</div>
          <div className="by">Built by <b>Space-O Technologies</b></div>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <h1>{TITLES[view][0]}</h1>
            <p>{TITLES[view][1]}</p>
          </div>
          <div className="kpis">
            <span><b>{providers.length}</b> providers</span>
            <span><b>{jobs.length}</b> open roles</span>
            <span><b>{eligibleCount}</b> eligible matches</span>
            <span className="kpi-bad"><b>{blocked}</b> blocked by verification</span>
          </div>
        </header>
        <div className="content">
          {view === "roles" && <Roles open={open} />}
          {view === "candidates" && <Candidates open={open} />}
          {view === "verification" && <Verification open={open} />}
          {view === "sourcing" && <Sourcing />}
          {view === "accuracy" && <Accuracy open={open} />}
          {view === "provider" && <ProviderApp />}
          {view === "how" && <How />}
        </div>
      </main>
      {drawer && <CandidateDrawer providerId={drawer.p} jobId={drawer.j} onClose={close} />}
    </div>
  );
}
