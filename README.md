# Anesthesia Match: proof of concept

A small, working sketch of provider-to-job matching for anesthesia recruiting, built by Space-O Technologies as part of our application for the Levels.ai engineering role.

## The idea

In anesthesia, most of "matching" is an eligibility problem, not a ranking problem. A strong provider is no use to a facility if they aren't licensed in that state, lack a DEA registration there, don't have the required case mix, or can't be credentialed by the start date. So matching runs in two layers:

1. **Hard eligibility, deterministic** (`src/lib/eligibility.ts`): role, state licence, DEA where required, board certification, required case mix, years of experience, contract type, and start date vs. credentialing lead time. Every rejection carries a reason. In production these are indexed SQL filters.
2. **AI soft-fit ranking, only on eligible pairs** (`scripts/rank.ts`): an LLM scores location, pay, call and schedule fit, case depth, and goals from the bio, and writes one reason for the hiring team and one for the provider. Provider names are never sent to the model.
3. **Evaluation**: a recruiter checklist labels the same pairs independently, and the app reports agreement plus every disagreement. That loop is what makes the ranking trustworthy and tunable.

The web app is static: rankings are generated at build time, so no API key reaches the browser.

## Run it

```bash
npm install
npm run seed                          # regenerate fictional sample data (deterministic)
GEMINI_API_KEY=... npm run rank       # hard filters + LLM ranking -> src/data/matches.json
npm run dev
```

## Sample data

Every provider and facility is fictional. Rule values (credentialing lead times, which states allow CAA practice, etc.) are illustrative only; a production system would maintain them in a reviewed compliance table per state and facility, and verify licences against primary sources.
