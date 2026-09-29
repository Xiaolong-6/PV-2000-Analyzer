# Versioning

PV-2000 Analyzer uses a date/ordinal version instead of SemVer.

## Mainline

Mainline versions are:

```text
vYYYYMMDD.N
```

`N` is the chronological order of accepted mainline commits on that date and starts at 1 each new calendar day.

Examples:

```text
v20260922.1
v20260922.2
v20260922.3
```

## Branches

A branch created from main version `vYYYYMMDD.N` appends a branch-local ordinal:

```text
vYYYYMMDD.N.1
vYYYYMMDD.N.2
...
```

For example, a branch from `v20260922.52` may contain `v20260922.52.1` and `v20260922.52.2`.

## Merge rule

Immediately before merging, read the current version on `main`.

The accepted PR is squash-merged as exactly one new mainline commit. Its branch suffix is discarded. The result receives the next available mainline ordinal for the current date.

Example:

- branch base: `v20260922.52`
- branch revisions: `v20260922.52.1`, `v20260922.52.2`
- main advances independently to `v20260922.55`
- merged result: `v20260922.56`

If the date has changed since the branch was created, use the new date and start that date's mainline ordinal at `.1` unless main already has commits for that date.

## Source of truth

The root `VERSION` file is authoritative. `package.json` is private and intentionally does not carry a SemVer package version.

Before merging a PR:

1. fetch/re-read current `main`;
2. resolve the next mainline version;
3. update `VERSION` and CHANGELOG;
4. run tests/build;
5. confirm `main` has not moved;
6. squash-merge with a commit title beginning with that resolved version.

If `main` moved, recompute the version and rerun the final validation.
