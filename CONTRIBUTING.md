# Contributing

Thanks for helping improve `homebridge-smartthings-windfree-ac`.

This project is intentionally modern and narrow: it targets Samsung WindFree AC devices through SmartThings, Homebridge 2.x, and Node.js 22.10+ or 24+. It does not support legacy config keys from older Samsung WindFree plugins.

## Development Setup

```bash
npm ci
npm run verify
```

`npm run verify` runs lint, TypeScript build, unit tests, and an npm package dry-run.

## Pull Request Scope

Keep pull requests focused. A good PR should change one behavior, one docs area, or one release/process concern.

Before opening a PR:

- run `npm run verify`;
- avoid logging tokens or secrets;
- update README/config docs when user-facing behavior changes;
- add or update Vitest coverage for config, discovery, OAuth, mode mapping, or optional service behavior.

## SmartThings Device Data

Real SmartThings payloads are useful, but they must be sanitized before they are posted in issues or pull requests.

Remove:

- device IDs if you do not want them public;
- account IDs;
- access tokens;
- refresh tokens;
- OAuth client secrets;
- authorization codes;
- location IDs;
- full Homebridge config files.

Capability names and sanitized status values are usually enough for development.

## Release Checklist

1. Run `npm run verify`.
2. Update `package.json` and `package-lock.json` versions.
3. Merge to `main`.
4. Create a GitHub release tag that matches the package version.
5. Confirm the publish workflow succeeds.
6. Live-test in Homebridge before requesting Homebridge Verified status.
