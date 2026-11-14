
## Local grade attempts

- 2026-11-14: `grade-local --driver process --instances 1` voided before the agent started. The local kit reported: `the instance has no input/env/ for the env to read its seed from`. Repeated once with the same result; no score or check breakdown was produced. This is a kit/instance setup fault, not a forge result.
- 2026-11-14 correction: the reported `spawnSync git EPERM` and `listen EPERM` were limitations of the resumed session's sandbox, not the forge or kit. `grade-local` works from a normal shell with `--driver process`; no score was produced by that sandboxed attempt.
