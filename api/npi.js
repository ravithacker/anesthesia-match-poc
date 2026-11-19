// Live proxy to the public NPPES NPI Registry (CMS). No key required; the registry does not allow
// browser CORS calls, so the app calls this function instead. Read-only, input whitelisted.
const TAXONOMY = {
  crna: "Nurse Anesthetist, Certified Registered",
  anesthesiology: "Anesthesiology",
  aa: "Anesthesiologist Assistant",
};

export default async function handler(req, res) {
  const { number, taxonomy, state, city, last } = req.query || {};
  const params = new URLSearchParams({ version: "2.1", enumeration_type: "NPI-1", limit: "50" });
  if (number) {
    if (!/^\d{10}$/.test(String(number))) return res.status(400).json({ error: "NPI must be 10 digits" });
    params.set("number", String(number));
    params.delete("enumeration_type");
  } else {
    if (!TAXONOMY[taxonomy]) return res.status(400).json({ error: "Unknown taxonomy" });
    if (!/^[A-Z]{2}$/.test(String(state || ""))) return res.status(400).json({ error: "State must be a 2-letter code" });
    params.set("taxonomy_description", TAXONOMY[taxonomy]);
    params.set("state", String(state));
    if (city && /^[A-Za-z .'-]{2,40}$/.test(String(city))) params.set("city", String(city));
    if (last && /^[A-Za-z'-]{2,40}$/.test(String(last))) params.set("last_name", String(last) + "*");
  }
  try {
    const r = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`, { signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    if (d.Errors) return res.status(400).json({ error: d.Errors.map((e) => e.description).join("; ") });
    const results = (d.results || []).map((x) => {
      const b = x.basic || {};
      const loc = (x.addresses || []).find((a) => a.address_purpose === "LOCATION") || {};
      return {
        npi: x.number,
        name: [b.first_name, b.last_name].filter(Boolean).join(" ") || b.organization_name,
        credential: b.credential || "",
        status: b.status === "A" ? "Active" : b.status,
        enumerated: b.enumeration_date,
        updated: b.last_updated,
        city: loc.city ? `${loc.city}, ${loc.state}` : "",
        taxonomies: (x.taxonomies || []).map((t) => ({ code: t.code, desc: t.desc, state: t.state, license: t.license, primary: t.primary })),
      };
    });
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ count: d.result_count, results, queriedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: "NPI Registry did not respond. Try again." });
  }
}
