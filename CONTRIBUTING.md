# Contributing

## Branches

| Branch | Purpose |
|---|---|
| `main` | Production. Every release is tagged `vX.Y.Z` (version from `package.json`). |
| `dev` | Integration branch, created from `main`. Changes arrive only through pull requests. |
| `feat/<name>`, `fix/<name>`, `refactor/<name>`, `chore/<name>` | Short-lived work branches, created from `dev`. |

Work branch names are lowercase kebab-case in English, e.g. `feat/orders-board`.

## Flow

1. Update `dev` and branch from it: `git switch dev && git pull && git switch -c feat/<name>`.
2. Commit (messages in English, imperative mood) and run the checks:

   ```bash
   npm run typecheck && npm test && npm run build
   ```

3. Push and open a pull request into `dev` (`gh pr create --base dev`). CI (`.github/workflows/ci.yml`)
   runs the same checks.
4. After the merge, delete the work branch.
5. Release: raise `version` in `package.json` through a work branch, open a pull request from `dev`
   into `main`, then tag `main` with `vX.Y.Z`.

`main` only accepts pull requests from `dev` (`main-only-from-dev` check); after every merge into
`main`, `sync-dev-with-main` opens the pull request that brings `main` back into `dev`.
