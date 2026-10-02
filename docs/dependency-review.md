# Dependency decisions — 2026-10-02

All eight open dependency PR patches were inspected against main `65f3a7a`; none includes unique product changes. Recreate useful upgrades on the current Cloudflare branch rather than merging stale snapshots. Close the original PRs only after the replacement passes CI and merges.

| PR | Disposition in finalization | Reason |
|---|---|---|
| #4, #5, #6 | Superseded by pinned checkout/setup-node/upload-artifact v7 commits | Current hosted runners support the maintained Actions runtime; permissions remain read-only outside explicit deploy credentials |
| #9 | Recreated as date-fns 4.4.0 | Existing named date APIs remain supported; no new timezone behavior enabled |
| #29 | Recreated as Motion 13.5.0 | 13.4.3's resolved motion-dom 13.5 caused a real missing-export build failure; matching versions fix it |
| #32, #34 | Decline React/DOM 19.3 separately | Expo 57 / RN 0.86 requires React 19.2.3; web/native React/DOM/types stay aligned, no security fix requires 19.3 |
| #36 | Split: adopt Vite 8.3.2/plugin-react 6.1.1 and Node 24 types | Vite 6.1 is unsupported; migrated Rolldown config. Do not install Node 26 types against Node 24, ESLint JS 10 against ESLint 9, or combine Tailwind 4/TS 7 major migrations without product/security need. Current supported compatible lint/TS/Tailwind setup is retained |

Recharts 3.10.1 replaces the old state/animation dependencies. LIMIT does not consume removed CategoricalChartState internals; chart browser tests and type checks cover actual usage. Wrangler 4.146.0 updates the vulnerable Undici path. npm remains the package manager; no demonstrated benefit warrants migration.

The initial root audit counted seven affected nodes. After compatible fixes, four high-severity nodes remain under **one** advisory, GHSA-86w9-cpqp-85rv (Expo CLI → signing certificates → node-forge). No patched version was published when checked. This is tooling-only RSA signature validation, not app/Worker authentication. Native signed/OTA releases are blocked. `security/audit-exceptions.json` narrowly permits only that package/advisory until **2026-10-15**, after which CI fails. Worker audit is zero. New advisories, service errors and expired exceptions fail CI; never describe this as zero root vulnerabilities. Recheck upstream weekly and remove the exception immediately when a compatible patch exists.

Sources: [Expo version matrix](https://docs.expo.dev/versions/v57.0.0/), [Vite support](https://vite.dev/releases), [Vite migration](https://vite.dev/guide/migration), [Motion upgrade guide](https://motion.dev/docs/upgrade-guide), [date-fns releases](https://github.com/date-fns/date-fns/releases), [Recharts 3 migration](https://github.com/recharts/recharts/wiki/3.0-migration-guide), [advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

Clean install also reports ESLint 9.39.5 as deprecated. The latest stable `eslint-plugin-react` 7.37.5 explicitly supports only ESLint through 9.7, so forcing ESLint 10 would violate a required plugin peer contract. Keep the last compatible lint runtime temporarily; this is a maintenance limitation, not an audit exception. Recheck a stable compatible React plugin by 2026-10-15. No lint rules or tests were disabled to bypass the mismatch. The remaining NO_COLOR/FORCE_COLOR warning comes from the host test environment's conflicting color variables; it does not change tests or application behavior.

Expo 57.0.26 / Router 57.0.24 compatibility alignment is included. npm hoisted incompatible latest optional native peers during that update; root development pins now constrain Reanimated 4.5.1, Screens 4.26.2 and Worklets 0.10.1 to the SDK matrix. Doctor must pass without excluded checks. A unit UI timeout under concurrent rendering/bundling was traced to CPU contention; unit workers are bounded to two, with the original assertions and timeout retained.
