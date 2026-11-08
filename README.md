# Retakt · Insurer web app

**Claims, complete in one call.** This is the insurer side of Retakt, built for the Taktile track at thinc! hack MUC, 7–8 November 2026.

Every open motor claim is decided by the insurer's own policy, with the reason. When the policy changes, Retakt replays every open claim and shows which ones need a second look, and why.

## Try it

| What | Link |
| --- | --- |
| **Insurer web app** (this repository) | **[the-empty-white-space.lovable.app](https://the-empty-white-space.lovable.app/)** |
| **Customer phone app** | **[retakt.92-5-27-43.sslip.io](https://retakt.92-5-27-43.sslip.io/)** |
| Engine, backend and full project | [sayed200350/thinchackathon](https://github.com/sayed200350/thinchackathon) |

Both apps run online, so no installation is needed. Use a desktop browser. All claims, people and policies in the demo are fictional.

## The concept

About 1 in 5 car claims bounces back to the customer because something is missing, and each time that means a week of waiting. A handler checks the documents of every claim by hand. When the insurer changes a rule, it takes about three weeks until the new rule is applied everywhere.

Retakt has three parts:

1. **Decision engine.** Each claim is decided rule by rule under the written policy. The decision names the matched rule, the facts behind it and the policy clause. Missing facts stay unknown and are never guessed.
2. **Policy replay.** Upload a new policy version and every claim is run against it. You see which open claims change, from what to what, and because of which rule. Closed claims keep their decision.
3. **AI assistant (Rico).** On the customer's phone, Rico collects the facts and documents, so a claim arrives complete. In this app, Rico answers questions about claims and walks new users through the workflow.

## How to test it

- **Landing page** (`/`): the open claims are routed under policy v1. Drag the quote threshold to see live which claims would change route.
- **Overview** (`/queue`): all open claims with their decision. Filter by decision and click a claim to see the rule, the reason and the deciding facts. **Edit claim** records a correction with a reason and your name.
- **Policy Update** (`/update`): upload a new policy version (for example `v2`) and apply it. You'll see how many claims changed, a heatmap of old versus new decisions, the changes per rule, and the cost of manual review compared with Retakt.
- **History** (`/history`): closed claims. Their decisions are protected and can't be corrected.
- **Submitted claims** (inbox icon, top right): claims sent in from the phone app, with the engine's recommendation and the original documents.
- **Rico:** the green assistant answers questions about claims. Hold it down to open the text chat. **Settings** (`/settings`) can restart the first-run tour.

**One claim end to end:** report a claim in the [phone app](https://retakt.92-5-27-43.sslip.io/), open **Submitted claims** here, read the recommendation, then change the policy under **Policy Update** and look at which open claims move.

## Decision rules (policy v1)

Checked in this order:

1. **Human review** (`v1.1`): policy not active on the day of the damage, not an own-damage claim, injury, disputed liability, possible duplicate, conflicting evidence, or a quote above €1,500.
2. **Request information** (`v1.2`): the incident report or the itemized quote is missing.
3. **Routine processing** (`v1.3`): everything else.

A blank field counts as a missing fact (`v1.missing`).

## Business case

For one insurer with 150,000 claims a year: **€873k net saving a year** (payback under 6 months), **−70% cost per policy change** (live the same day instead of in about three weeks), and claims sent back to the customer down from **21% to 0%**. Retakt earns **€500k per insurer a year** (€50k licence + €3 per claim) at a 73% gross margin.

## Tech

- [TanStack Start](https://tanstack.com/start) with React and Vite, UI components from shadcn/ui
- [Supabase](https://supabase.com) for claims, decisions, overrides and policies (migrations in `supabase/migrations/`)
- Built and edited with [Lovable](https://lovable.dev/projects/74fbd7ca-9721-4ff2-a748-2f86b9cd8de5). Every change made in Lovable is committed to this repository, and pushes to `main` sync back into Lovable.

## Run locally

You need Node.js and npm.

```sh
git clone https://github.com/rafik-324/thinc-hack.git
cd thinc-hack
npm i
npm run dev
```

Create a `.env` with the Supabase project (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). The optional server-side settings are:

- `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`: Rico's answers
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`: read-aloud
- `INBOX_API_ORIGIN`, `INBOX_REVIEWER_KEY`: the submitted-claims inbox

Never commit keys.

Run the tests with `npm test`.

## Team

Built by Sayed (engine, backend) and Rafik (apps, business case, demo).
