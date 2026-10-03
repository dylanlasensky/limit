# Temporary first-party braces security fork

`vendor/braces` starts from the published `braces@3.0.3` npm tarball (SHA-256
`1cd18e862c8640b4568b1425a7df4ee030ff201d45b2da8f9f222d2987494ffc`,
MIT license retained). Its executable `lib` files contain the nesting-depth
guards from [upstream security PR #72, commit `d0d575e`](https://github.com/micromatch/braces/pull/72/commits/d0d575e55e74a4e0218e5248fafb79efc3e54ebb).
The published tarball, rather than the upstream master branch, is the base:
master includes unrelated parser changes that are not part of this fork.
`3.0.4-limit.1` identifies this local build and **is not an upstream release**.

The root direct `file:vendor/braces` dependency and `$braces` override make
`npm ci` link every transitive consumer to the reviewed source. The security
gate still runs the unfiltered root and Worker npm audits and the secret scan.
`scripts/verify-braces-fork.mjs` requires the expected source hashes, one
installed fork, and the locked local path; it fails if source or resolution
changes. `src/__tests__/bracesSecurity.test.js` checks normal Micromatch behavior,
the 100-level boundary, over-limit string patterns, strict custom limits, and
all direct AST entry points. The upstream 3.0.3 source suite passed **764/764**
with these exact patched library files. The upstream PR's current master suite
has 899 tests; its unrelated parser changes make 42 tests fail when the
published 3.0.3 parser is substituted, so those 899 are **not** claimed for
this fork. The root and Worker `npm ci`, unchanged audit with the added integrity check,
478 unit tests in 51 files, 12 local API checks, 182 browser tests with eight
intentional viewport skips, workout/offline browser smoke, two native bridge
tests, lint, web/Worker/native types, Expo Doctor 21/21, iOS/Android/web
JavaScript exports, and the production web build passed locally. The exports
are not physical-device tests.

This dependency is currently used by build and Expo Metro file-map tooling;
LIMIT application source and deployed web/Worker bundles do not import it.
The local fork carries maintenance risk: review every future upstream security
notice and replace it with a compatible official patched release promptly.
Remove the direct dependency, override, integrity script, and this directory
in the same tested change when the official patch is adopted. Never treat a
clean npm audit alone as proof of the fork's safety. The separate node-forge
exception and native signing restriction remain unchanged.
