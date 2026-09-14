# Base44 Project

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.

See the [Base44 CLI docs](https://docs.base44.com/developers/references/cli/get-started/overview) if you want to run Base44 commands directly.

## Run Locally

Run the full local development environment from the project root:

```bash
base44 dev
```

`base44 dev` starts the local Base44 development backend and, when this app is configured for it, also starts the frontend dev server for you. Use the frontend URL printed by the command.

For example, when the Base44 project config includes a `serveCommand`, `base44 dev` can launch the frontend too:

```json5
{
  "site": {
    "serveCommand": "npm run dev"
  }
}
```

In a Base44 project this lives in `base44/config.jsonc`.

## Run Only The Frontend

If you only want to work on the frontend against the hosted Base44 backend, run:

```bash
npm run dev
```

Open the local URL printed by Vite.

## Use The Hosted Backend

For frontend-only development, create or update `.env.local` in the project root:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

`VITE_BASE44_APP_ID` identifies the Base44 app.

`VITE_BASE44_APP_BASE_URL` tells the Base44 Vite plugin where to send local `/api` requests. Point it at your deployed Base44 app URL when you want the local frontend to use the hosted backend.

When you use `base44 dev`, the command injects the local Base44 values for you, so `.env.local` is mainly needed for frontend-only workflows.

## Checks

```bash
npm run lint        # eslint
npm run typecheck   # tsc (checkJs)
npm test            # vitest (jsdom + Testing Library); `npm run test:watch` for watch mode
npm run build       # vite build -> ./dist
```

Tests live in `src/__tests__/` and use the `@` alias configured in `vitest.config.js`.

## Publish Your Changes

Merging to `main` deploys automatically (see [CI/CD](#cicd)). To publish manually, open the Base44 dashboard:

```bash
base44 dashboard open
```

## CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`.

**On every pull request and push to `main`:**

- `quality` — `npm ci`, `npm run lint`, `npm run typecheck`
- `test` — `npm test` (vitest)
- `build` — `npm run build` with `VITE_BASE44_APP_ID` / `VITE_BASE44_APP_BASE_URL` injected, uploads `dist/` as an artifact

**Only on `main` (push, or a manual `workflow_dispatch` of `main`):**

- `deploy` — waits for `quality`, `test` and `build`, runs in the `production` environment (serialized via the `deploy-production` concurrency group), installs the Base44 CLI, downloads the built `dist/` and runs `base44 deploy --yes --no-build --json`. This pushes entities, functions, connectors, agents, auth config and the site from `base44/` and `dist/` to the app identified by `BASE44_APP_ID`.

### One-time GitHub setup

1. Create an environment named **`production`** (Settings → Environments). Add required reviewers there if you want a manual approval gate before each deploy.
2. Add these **secrets** (environment secrets on `production`, or repository secrets):

   | Secret | Value |
   | --- | --- |
   | `BASE44_API_KEY` | **Option A.** Workspace API key (must start with `b44k_`; Business plan, owner/admin). Base44 dashboard → workspace name → Settings → Secrets → Create API Key. Personal `b44u_` keys are not accepted by the CLI. |
   | `BASE44_ACCESS_TOKEN` + `BASE44_REFRESH_TOKEN` | **Option B** (if you can't create a workspace key). After `base44 login`, copy `accessToken` / `refreshToken` from `~/.base44/auth/auth.json`: `jq -r .refreshToken ~/.base44/auth/auth.json \| gh secret set BASE44_REFRESH_TOKEN` (same for `accessToken`). CI then deploys as that user. |
   | `BASE44_APP_ID` | The Base44 app ID (same value as `VITE_BASE44_APP_ID` in `.env.local`). |

3. Add this repository **variable** (Settings → Secrets and variables → Actions → Variables):

   | Variable | Value |
   | --- | --- |
   | `BASE44_APP_BASE_URL` | Deployed app URL, e.g. `https://your-app.base44.app` (same as `VITE_BASE44_APP_BASE_URL`). |

The deploy job fails fast with a clear error if neither auth option is configured, if `BASE44_API_KEY` has the wrong prefix, or if `BASE44_APP_ID` is missing. Pull requests never deploy; on PRs from forks the secrets are empty and the build still runs.

Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm packages and GitHub Actions. The project `.npmrc` enforces `min-release-age=7` for `npm install`; the CI job installs the Base44 CLI from outside the repo so that rule does not block the CLI's JSR dependency.

## Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Base44 CLI command reference: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)

Support: [https://app.base44.com/support](https://app.base44.com/support)
