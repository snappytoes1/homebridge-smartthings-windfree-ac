# Homebridge SmartThings WindFree AC

Homebridge dynamic platform plugin for Samsung WindFree air conditioners exposed through the SmartThings API.

This is a clean project with a new package name, platform alias, config shape, and OAuth2-first setup flow. It does not support legacy config keys from older Samsung WindFree plugins.

## Requirements

- Homebridge with Node.js 22 or 24.
- Samsung WindFree AC paired with SmartThings.
- SmartThings OAuth app credentials or a temporary Personal Access Token.

## Install

From npm after publish:

```bash
npm install -g homebridge-smartthings-windfree-ac
```

From GitHub:

```bash
npm install -g github:snappytoes1/homebridge-smartthings-windfree-ac#main
```

The package builds `dist` during GitHub installs through the `prepare` script.

## Homebridge Plugin Catalog

After the first npm publish, the plugin can appear in the Homebridge UI plugin search because the package is public and includes the `homebridge-plugin` npm keyword.

Catalog readiness checklist:

- publish `homebridge-smartthings-windfree-ac` to npm;
- keep the package public and unscoped;
- keep the `homebridge-plugin` keyword in `package.json`;
- keep `config.schema.json` in the npm package;
- create a GitHub release for every npm release.

Homebridge Verified is a separate manual review. After the first live-tested npm release, request verification in the Homebridge plugin registry repository and include the npm package name, GitHub repository, release version, and evidence that CI passes on Node.js 22 and 24.

## Homebridge Config

```json
{
  "platform": "SmartThingsWindFreeAC",
  "name": "Samsung WindFree AC",
  "baseUrl": "https://api.smartthings.com/v1",
  "authMethod": "oauth2",
  "clientId": "SMARTTHINGS_CLIENT_ID",
  "clientSecret": "SMARTTHINGS_CLIENT_SECRET",
  "redirectUri": "https://httpbin.org/get",
  "refreshToken": "SMARTTHINGS_REFRESH_TOKEN",
  "deviceId": "88270343-0a0f-d7b3-fa66-c98918e20776",
  "exposeWindFree": true,
  "exposeDisplay": true,
  "exposeAutoClean": true,
  "exposeSwing": true,
  "exposeFan": true,
  "debug": false
}
```

PAT setup is supported for temporary use:

```json
{
  "platform": "SmartThingsWindFreeAC",
  "name": "Samsung WindFree AC",
  "baseUrl": "https://api.smartthings.com/v1",
  "authMethod": "pat",
  "accessToken": "SMARTTHINGS_PAT_TOKEN",
  "deviceId": "88270343-0a0f-d7b3-fa66-c98918e20776"
}
```

## OAuth2 Setup

1. Create a SmartThings OAuth integration in the SmartThings developer console.
2. Add the same redirect URI in SmartThings and Homebridge. The default is `https://httpbin.org/get`.
3. Open the plugin settings in Homebridge UI.
4. Enter `clientId`, `clientSecret`, and `redirectUri`.
5. Click `Create authorize URL`.
6. Open the URL, approve access, then paste the returned authorization code or full redirect URL.
7. Click `Exchange code`.
8. Save the config.

The plugin uses the authorization-code flow and stores the resulting `refreshToken`. It never logs PATs, client secrets, authorization codes, access tokens, or refresh tokens.

## Device Discovery

Discovery collects capabilities from all SmartThings device components. A supported AC must expose:

- `switch`
- `airConditionerMode`
- `thermostatCoolingSetpoint`

`ocf.deviceType === "oic.d.airconditioner"` is logged as a strong AC hint, but capabilities decide whether the accessory is exposed.

Use `deviceId` for the most reliable selection. `deviceLabel` is available when the SmartThings ID is not convenient. If neither is set, the plugin auto-discovers supported AC devices.

Expected startup logs include:

```text
Received N SmartThings devices.
Adding new accessory: Air Conditioner
```

## HomeKit Services

The Thermostat service exposes:

- power through target heating/cooling state off/on
- current mode
- target mode
- current temperature
- target cooling setpoint

Optional services are added only when enabled and supported by the device capabilities:

- WindFree switch
- Display switch
- Auto Clean switch
- Swing switch
- Fan service

## Child Bridge

Run this plugin as a Homebridge Child Bridge. SmartThings devices and Samsung custom capabilities can behave differently across firmware versions, and a child bridge isolates plugin restarts from the main Homebridge process.

## Troubleshooting

If no accessory appears, check the Homebridge logs for:

```text
Missing capabilities: [...]
Found capabilities: [...]
Available devices: [...]
```

Common fixes:

- Set `deviceId` from the Homebridge UI discovery result.
- Confirm the AC is online in SmartThings.
- Re-run OAuth setup if the refresh token was revoked.
- Use PAT auth temporarily to separate OAuth issues from device capability issues.
- Enable `debug` in the plugin config for more detail.

After live testing, revoke old PATs and rotate client secrets used during setup.

## Development

```bash
npm ci
npm run lint
npm run build
npm test
npm run pack:dry-run
```

Use `npm run verify` to run lint, build, tests, and package dry-run together.

## Release

1. Run `npm run verify`.
2. Update `package.json` version.
3. Merge to `main`.
4. Create a GitHub release tag matching the package version, for example `v0.1.0-beta.1`.
5. The `Publish` workflow publishes prereleases with npm tag `beta` and stable releases with npm tag `latest`.

The publish workflow requires an `NPM_TOKEN` repository secret with permission to publish `homebridge-smartthings-windfree-ac`.
