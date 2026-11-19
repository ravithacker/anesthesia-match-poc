import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.7 2.7 2.4 3 5.2" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z" /><path d="m8.8 12 2.2 2.2 4.3-4.4" /></>,
  radar: <><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.6-4.6" /><path d="M8 11h6M11 8v6" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  pin: <><path d="M12 21s-6.5-6.1-6.5-11.2A6.5 6.5 0 0 1 18.5 9.8C18.5 14.9 12 21 12 21z" /><circle cx="12" cy="10" r="2.3" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  dollar: <><path d="M12 3v18M16.5 7.5c-.8-1.3-2.4-2-4.5-2-2.6 0-4 1.3-4 3s1.5 2.6 4 3.2 4.5 1.5 4.5 3.4-1.9 3.4-4.6 3.4c-2.3 0-4-.9-4.8-2.4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8L16.2 9.6" /></>,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.3v.2" /></>,
  xCircle: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  award: <><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.5-1.5 7.5 5-2.7 5 2.7-1.5-7.5" /></>,
  cap: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c1.7 1.5 3.7 2.2 6 2.2s4.3-.7 6-2.2v-5M22 9v6" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15M10 21v-3h4v3" /></>,
  activity: <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  sparkles: <><path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9z" /><path d="M19 3v3M17.5 4.5h3" /></>,
  inbox: <><path d="M3 13h5l1.5 2.5h5L16 13h5" /><path d="M5.5 5h13L21 13v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-6z" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.2" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.5-1.6 1.7-2.4 3.2-2.4s2.7.8 3.2 2.4M14.5 10H18M14.5 13.5H18" /></>,
  pill: <><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)" /><path d="m10 8.3 4.3 6.2" transform="rotate(0)" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  heart: <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>,
};

export function Icon({ name, size = 17, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
