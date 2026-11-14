
## Local grade attempts

- 2026-11-14: `grade-local --driver process --instances 1` voided before the agent started. The local kit reported: `the instance has no input/env/ for the env to read its seed from`. Repeated once with the same result; no score or check breakdown was produced. This is a kit/instance setup fault, not a forge result.
- 2026-11-14 correction: the reported `spawnSync git EPERM` and `listen EPERM` were limitations of the resumed session's sandbox, not the forge or kit. `grade-local` works from a normal shell with `--driver process`; no score was produced by that sandboxed attempt.
- 2026-11-14 Round 4: `grade-local --driver process --instances 1` finished at **860** (feature 485, agent 200, perf 175, working 1). Check groups: git 11/30, graphql 16/20, issues 15/15, mcp 15/15, protocol 5/5, pulls 20/20, repos 15/15. Kept trial: `/home/hatch/.makefun/trials/github-core-clone-01/01a1d8f2-bff3-7138-86d4-7d45b1a4d75d/trial-0`.
  - REST driver after the PUT metadata, pagination origin, and default pull-list fixes: 53/53 pass.
  - Git driver: 11/30 pass. Remaining reported failures are `git.ls-refs` (tag ref target), `git.ls-refs-prefix` (prefix filtering and HEAD), clone/fetch object closure and shallow-history checks, `git.pack-deltas`, `git.push-update-ref`, `git.push-delete-branch`, `git.push-non-fast-forward`, `git.push-mixed-report`, and `git.repo-survives-errors`.
  - Grade-local GraphQL failures: `create-pull-request`, `merge-pull-request`, `pull-request-files`, and `pull-requests-list`; `repository-fields` now passes.
