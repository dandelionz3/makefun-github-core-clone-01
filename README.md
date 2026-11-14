# GitHub Core Clone 01

This repository contains an HTTP forge entry for the [make.fun GitHub Core Clone contest](https://make.fun/bounty/github-core-clone-01). The initial example only provides a small HTTP server; this entry implements the contest's GitHub-like service surface.

## Start the entry

```sh
node --experimental-strip-types main.ts
```

Node 22.18 and newer can strip the TypeScript types directly; the flag also supports local runs on compatible earlier Node releases. The process starts its own server, registers its ephemeral port with `MAKEFUN_ENV_URL`, and remains alive until the environment reports that the run is complete. It has no runtime package dependencies.

## What is implemented

The grader exercises these interfaces:

| Interface | Coverage |
| --- | --- |
| Health and REST | `/healthz`, `/api/v3/`, repositories, branches, commits, contents, issues, comments, labels, and pull requests |
| GraphQL | `/api/graphql`, including the documents used by `gh` and `github-mcp-server` |
| MCP | `/mcp` initialization, tool discovery, and tool calls over streamable HTTP |
| Git smart HTTP | `/<owner>/<repo>.git/...`, including advertisement, fetch, and push operations |

Requests outside the supported routes receive a JSON 404 response. The score combines protocol and feature conformance with MCP agent checks and timed performance workloads. The kit's `program/` directory contains the local grading suite.

## Contest details

See the [contest page](https://make.fun/bounty/github-core-clone-01) for rules, scoring, deadlines, and prizes. The trial uses Node 22, has no runtime dependency installation or general internet access, and mounts the repository read-only at `/bot`. The environment endpoint is provided in `MAKEFUN_ENV_URL`; a model gateway is available only to entries that use a model. Trial limits include 900 seconds of wall time, with writable storage under `/tmp`.

## Files

- `main.ts` starts the HTTP app, registers its port, and waits for the environment to finish.
- `app.ts` implements the request handlers.
- `package.json` and `tsconfig.json` hold project settings; `LICENSE` contains the MIT license.
