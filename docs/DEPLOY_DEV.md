# Dev/Staging Deployment on Vercel (Hobby, non-commercial)

This is a one-time setup checklist for the owner. The pipeline (`.github/workflows/deploy-dev.yml`)
builds the proprietary `dms-engine` on GitHub Actions and deploys the **prebuilt** Next.js
output to Vercel with `vercel deploy --prebuilt`. Vercel's own Git integration must stay
**disabled** for this project — it cannot access the private engine repo, so it must never
build.

## When it deploys

Only when started by hand: Actions → **Deploy Dev (Vercel)** → Run workflow, on the branch
to deploy, choosing a target:

- `preview` → a preview deploy of that branch, built against the engine branch with the
  same name when one exists in the engine repo, otherwise engine `main`. If the branch has
  an open PR, the preview URL is posted (and kept updated in place) as a single PR comment.
- `production` → a production deploy (the stable dev URL), built against engine `main`.

Before anything is built, the workflow runs the **Test** workflow (unit tests and the
`/dev/ui` a11y and screenshot checks). The deploy job `needs` it, so a failing test means
nothing is built or deployed.

No push, PR or engine change deploys on its own. The only workflow that runs on every
commit is **Lint** (ESLint, the boundary, colour and contrast checks, and the type check).

## 1. Create the Vercel project

1. Sign in to Vercel (Hobby tier is fine for a non-commercial dev/staging site).
2. Create a new project from this repo, framework **Next.js**.
3. Immediately disable Git-triggered builds for the project (this repo's `vercel.json`
   already sets `"git": {"deploymentEnabled": false}`, but confirm in the Vercel dashboard
   under Project Settings → Git that automatic deployments are off — the engine source
   isn't available to Vercel's own build, so it must never run).
4. Locally, from `dimensys/`, run:
   ```bash
   npx vercel@60.1.3 link
   ```
   This writes `.vercel/project.json` with your org/project IDs. **`.vercel/` is already
   gitignored** (see `.gitignore`) — never commit it.
5. Read the IDs back out:
   ```bash
   cat .vercel/project.json
   ```

## 2. GitHub secrets — dimensys (`nexus-hash/dimensys`)

Add under Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | A Vercel personal access token (Account Settings → Tokens). Scope it to this project/team if possible. |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json`. |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json`. |
| `DMS_ENGINE_REPO` | Already exists (also used by `deploy.yml`) (e.g. `nexus-hash/dms-engine`) — reused by `deploy-dev.yml`. |
| `DMS_ENGINE_PAT` | Already exists (also used by `deploy.yml`) — reused by `deploy-dev.yml` to check out the private engine. |

Note: `deploy-dev.yml` does **not** use `DMS_ENGINE_REF`. A production deploy always builds
engine `main`; a preview builds the same-named engine branch when one exists (else engine
`main`).

## 3. Triggering a deploy

Actions → **Deploy Dev (Vercel)** → Run workflow → pick the branch and the target. The run
shows the Test jobs first, then the deploy.

## 4. Finding the URL

- The `deploy-dev.yml` job's `Deploy to Vercel` step logs the deployment URL, and the run
  summary/output shows it directly (also captured as the step output).
- The Vercel dashboard's Deployments tab shows every deploy and which one is currently
  "Production" (aliased to the stable dev domain).
- For a preview of a branch with an open PR, the URL is posted (and kept updated in place) as a single PR comment.

## 5. Rolling back

- **Fastest:** `vercel rollback` (or in the dashboard, Deployments → pick a prior
  production deployment → "Promote to Production") — instantly re-points the production
  alias at a known-good build, no rebuild needed.
- **Equivalent CLI:** `npx vercel@60.1.3 promote <deployment-url-or-id> --token=$VERCEL_TOKEN`.
- **Rebuild instead:** re-run the `Deploy Dev (Vercel)` workflow (`workflow_dispatch`) at
  the commit/tag you want — it does a fresh engine+app build rather than reusing a stored
  artifact.

## Hobby tier / non-commercial note

This project is deployed on Vercel's Hobby plan, which is licensed for personal,
non-commercial use. Keep this dev/staging deployment non-commercial; if the project
becomes commercial, upgrade to a paid Vercel plan per Vercel's terms.
