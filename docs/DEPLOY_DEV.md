# Dev/Staging Deployment on Vercel (Hobby, non-commercial)

This is a one-time setup checklist for the owner. The pipeline (`.github/workflows/deploy-dev.yml`)
builds the proprietary `dms-engine` on GitHub Actions and deploys the **prebuilt** Next.js
output to Vercel with `vercel deploy --prebuilt`. Vercel's own Git integration must stay
**disabled** for this project — it cannot access the private engine repo, so it must never
build.

## When it deploys

- Push to `main` (this repo) → production deploy (the stable dev URL).
- `repository_dispatch` of type `engine-updated` (sent by dms-engine's `notify-app.yml`
  after a push to engine `main` passes engine CI) → production deploy, rebuilt against the
  engine commit that triggered it.
- Manual `workflow_dispatch` → production deploy (rebuilds against dimensys `main` +
  engine `main`).
- Pull requests **whose base branch is `main`**, from branches in this repo only (fork PRs
  are skipped — forks don't have access to the deploy secrets) → preview deploy, with the
  preview URL posted/updated as a single PR comment. The preview builds against the engine
  branch with the same name as the PR's head branch when one exists in the engine repo,
  otherwise engine `main`.

Nothing else triggers a deploy: pushes to any branch other than `main`, and PRs targeting
any branch other than `main` (e.g. `task/* → v3`), are ignored by both the workflow's
`on:` filters (`push`/`pull_request: branches: [main]`) and a belt-and-suspenders job-level
`if:` guard (`github.event_name != 'pull_request' || github.base_ref == 'main'`).

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
| `DMS_ENGINE_REPO` | Already exists for `build.yml` (e.g. `nexus-hash/dms-engine`) — reused by `deploy-dev.yml`. |
| `DMS_ENGINE_PAT` | Already exists for `build.yml` — reused by `deploy-dev.yml` to check out the private engine. |

Note: `deploy-dev.yml` does **not** use `DMS_ENGINE_REF`. For `push`/`workflow_dispatch` it
always builds engine `main`; for `repository_dispatch` it builds the exact commit the engine
push produced; for a `pull_request` preview it builds the same-named engine branch when one
exists (else engine `main`) — by design, since the dev site otherwise tracks engine `main`.

## 3. GitHub secret — dms-engine (`nexus-hash/dms-engine`)

| Secret | Value |
|---|---|
| `APP_DISPATCH_TOKEN` | A fine-grained GitHub PAT used by `notify-app.yml` to send `repository_dispatch` to `nexus-hash/dimensys`. |

**Minimal scope for `APP_DISPATCH_TOKEN`:** create a fine-grained PAT restricted to the
single repository `nexus-hash/dimensys`, with repository permission **"Contents: read and
write"**. Per GitHub's REST API docs, the `POST /repos/{owner}/{repo}/dispatches` endpoint
requires `contents: write` on the *target* repository (there is no narrower, dedicated
"dispatch" permission) — read-only `contents: read` is not sufficient. Do not grant any
other permission, and do not scope it to the engine repo (it only needs to write to
dimensys).

## 4. Triggering the first deploy

- Simplest: push any commit to dimensys `main` (or re-run `workflow_dispatch` from the
  Actions tab for `Deploy Dev (Vercel)`).
- Or push to dms-engine `main`: once its CI passes, `notify-app.yml` fires
  `repository_dispatch` (`engine-updated`) at dimensys, which starts a production deploy
  here automatically.

## 5. Finding the URL

- The `deploy-dev.yml` job's `Deploy to Vercel` step logs the deployment URL, and the run
  summary/output shows it directly (also captured as the step output).
- The Vercel dashboard's Deployments tab shows every deploy and which one is currently
  "Production" (aliased to the stable dev domain).
- For PRs, the preview URL is posted (and kept updated in place) as a single PR comment.

## 6. Rolling back

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
