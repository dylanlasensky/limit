# Vite bundle measurements

Measured on 2026-09-15 using the production browser-test build (Vite 6.4.3), with identical test app environment values. Values below are bytes, compressed per file using Node's `gzipSync` defaults. Route figures include the entry chunk and the recursive static import graph, counting each file once. They exclude CSS, fonts, API responses, and optional dynamic imports. They describe download size, not measured load time.

| Metric | Original main (`0049393`) | Responsive pages (`b820202`) | Bundle changes |
| --- | ---: | ---: | ---: |
| All JavaScript, raw | 1,518,073 | 1,522,658 | 1,525,651 |
| All JavaScript, gzip | 480,223 | 481,740 | 487,214 |
| All CSS, gzip | 15,738 | 16,737 | 11,988 |
| Entry static JavaScript, gzip | 209,279 | 209,563 | 203,527 |
| Health/Today static JavaScript, gzip | 377,873 | 378,382 | 261,068 |
| Live workout static JavaScript, gzip | 245,304 | 245,660 | 235,352 |
| Progress route chunk alone, gzip | 129,275 | 129,473 | 18,476 |

Compared with the responsive-pages branch, opening Health/Today needs 117,314 fewer compressed JavaScript bytes (31%). CSS shrinks 28%. Total JavaScript grows 1.1% because splitting introduces chunk boundaries and reduces compression across modules. This work reduces the code needed for individual visits; it does not remove the chart functionality.

## Changes

- Strength and weight charts load when their views render; the default Today view does not import Recharts.
- Register, forgot-password and reset-password load on navigation through the existing route Suspense boundary.
- Confetti loads only for a personal-record celebration. Download failures do not interrupt the workout summary, and leaving the summary cancels a pending celebration.
- React, React DOM and Scheduler share a reusable vendor chunk. The production HTML preloads only this vendor chunk; charts remain outside the entry import graph.
- Removed 39 unreferenced UI modules and 42 unused direct dependencies. The lockfile removes 177 package entries without changing any retained package version.

## Verification

A clean `npm ci` followed by lint, typecheck, formatting, source guards, 430 unit tests, and the production-build browser suite passed. Browser coverage includes 320px, 390px, 430px, 820px and 1280px viewports, plus targeted 1024px/1440px layout checks and a 600px-high desktop dialog check. The suite passed 157 checks; eight skips are desktop-only checks in the four smaller projects.

Full-page screenshots of the five main phone screens remained pixel-identical to the original main build in the same browser test fixtures. Both themes and overflow checks pass on every configured viewport.

To repeat a build, run `npm run build`. To inspect the static versus dynamic dependency graphs, run `npm run build -- --manifest` and inspect `dist/.vite/manifest.json`; sum each unique imported asset once, applying gzip per file. Compression settings, dependency versions, and environment values must match for byte comparisons.
