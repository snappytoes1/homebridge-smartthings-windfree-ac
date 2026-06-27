# Homebridge SmartThings WindFree AC

Modern Homebridge dynamic platform plugin for Samsung WindFree air conditioners connected through the SmartThings API.

The plugin is built as a clean project, not a compatibility fork. It uses the new `SmartThingsWindFreeAC` platform alias, OAuth2-first setup, a custom Homebridge UI, SmartThings device discovery, and optional HomeKit controls for Samsung-specific features. Legacy config keys and the old platform name are intentionally unsupported.

## Status

This project is pre-1.0. Automated tests use SmartThings fixtures and mocks; real-device verification still requires a Samsung WindFree AC paired with a SmartThings account.

## Features

- Dynamic Homebridge platform plugin for Samsung WindFree AC devices.
- OAuth2 authorization-code flow with refresh token support.
- Temporary Personal Access Token setup for troubleshooting and first-run testing.
- Custom Homebridge UI for credentials, OAuth token exchange, device discovery, device selection, optional services, and debug logging.
- SmartThings discovery across all device components and capabilities.
- HomeKit Thermostat service for power, mode, current temperature, and target cooling setpoint.
- Optional HomeKit services for Display, Auto Clean, Swing, and Fan when the SmartThings device exposes the matching capabilities.
- WindFree can be controlled through HomeKit Fan speed `0%` when both WindFree and Fan capabilities are available.
- Bounded SmartThings API timeout/retry behavior and secret-safe logs.

## Requirements

- Homebridge `>=2.1.0`.
- Node.js `22.10+` or `24+`.
- Samsung WindFree AC paired with SmartThings.
- SmartThings OAuth client credentials, or a temporary SmartThings Personal Access Token.

Node 18 and Node 20 are not supported.

## Installation

Install from npm after the first publish:

```bash
npm install -g homebridge-smartthings-windfree-ac
```

Install from GitHub `main` before npm publish:

```bash
npm install -g github:snappytoes1/homebridge-smartthings-windfree-ac#main
```

GitHub installs build `dist` through the package `prepare` script.

## Quick Setup

1. Install the plugin in Homebridge.
2. Run it as a Homebridge Child Bridge.
3. Open the plugin settings in Homebridge UI.
4. Choose `OAuth2` for normal setup or `PAT` for temporary troubleshooting.
5. Test credentials and run device discovery.
6. Select the SmartThings AC device.
7. Enable only the optional controls you want HomeKit to expose.
8. Save, restart the child bridge, and check the logs.

Expected startup logs include:

```text
Received N SmartThings devices.
Adding new accessory: Air Conditioner
```

The exact accessory name comes from the SmartThings device label.

## OAuth2 Setup

OAuth2 is the preferred setup path.

1. Create a SmartThings OAuth integration in the SmartThings developer console.
2. Configure the redirect URI in SmartThings and in Homebridge. The default helper value is `https://httpbin.org/get`.
3. In Homebridge UI, enter `clientId`, `clientSecret`, and `redirectUri`.
4. Click `Create authorize URL`.
5. Open the authorize URL, approve access, and copy the returned authorization code or full redirect URL.
6. Paste it into the Homebridge UI helper.
7. Click `Exchange code`.
8. Save the generated `refreshToken` in the plugin config.

Default OAuth scopes requested by the UI helper:

```text
r:devices:* w:devices:* x:devices:*
```

The plugin exchanges refresh tokens for short-lived access tokens at runtime. If SmartThings rotates the refresh token, the plugin attempts to persist the new value through Homebridge.

## PAT Setup

Personal Access Token auth is supported for temporary/manual setup:

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

Use PAT auth to separate OAuth problems from device capability problems. Revoke temporary PATs after testing.

## Example OAuth Config

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

## Configuration Reference

| Key | Required | Default | Description |
| --- | --- | --- | --- |
| `platform` | yes | `SmartThingsWindFreeAC` | Homebridge platform alias. |
| `name` | yes | `Samsung WindFree AC` | Display name used by Homebridge. |
| `baseUrl` | yes | `https://api.smartthings.com/v1` | SmartThings REST API base URL. |
| `authMethod` | yes | `oauth2` | `oauth2` or `pat`. |
| `clientId` | OAuth2 | none | SmartThings OAuth client ID. |
| `clientSecret` | OAuth2 | none | SmartThings OAuth client secret. |
| `redirectUri` | OAuth2 | `https://httpbin.org/get` | Redirect URI registered in SmartThings. |
| `refreshToken` | OAuth2 | none | SmartThings OAuth refresh token generated by the UI helper. |
| `accessToken` | PAT | none | SmartThings Personal Access Token. |
| `deviceId` | no | none | Exact SmartThings device ID. Highest-priority filter. |
| `deviceLabel` | no | none | Exact SmartThings device label or name. Used only when `deviceId` is not set. |
| `exposeWindFree` | no | `true` | Enable WindFree through HomeKit Fan speed `0%` if the device supports it. No separate WindFree switch is exposed. |
| `exposeDisplay` | no | `true` | Expose Display switch if the device supports it. |
| `exposeAutoClean` | no | `true` | Expose Auto Clean switch if the device supports it. |
| `exposeSwing` | no | `true` | Expose Swing switch if the device supports it. |
| `exposeFan` | no | `true` | Expose Fan service if the device supports it. |
| `debug` | no | `false` | Enable extra Homebridge debug logging. |

Unsupported legacy keys include `BaseURL`, `AccessToken`, `OptionalWindFreeSwitch`, and `OptionalDisplaySwitch`.

## Device Discovery

Discovery reads all capabilities from all SmartThings device components.

Required capabilities:

- `switch`
- `airConditionerMode`
- `thermostatCoolingSetpoint`

Optional capabilities:

| HomeKit control | SmartThings capability |
| --- | --- |
| WindFree through Fan speed `0%` | `custom.airConditionerOptionalMode` |
| Display switch | `samsungce.airConditionerLighting` |
| Auto Clean switch | `custom.autoCleaningMode` |
| Swing switch | `fanOscillationMode` |
| Fan service | `airConditionerFanMode` |

The SmartThings `ocf.deviceType` value `oic.d.airconditioner` is treated as a strong AC hint, but capabilities decide whether the plugin exposes the device.

Filtering order:

1. `deviceId`, when present.
2. `deviceLabel`, when `deviceId` is absent.
3. Auto-discovery of all supported AC devices.

## HomeKit Behavior

The main HomeKit service is Thermostat.

| HomeKit | SmartThings |
| --- | --- |
| Target Heating/Cooling State Off | `switch.off` |
| Target Heating/Cooling State Auto | `switch.on` plus `airConditionerMode.auto` |
| Target Heating/Cooling State Cool | `switch.on` plus `airConditionerMode.cool` |
| Target Heating/Cooling State Heat | `switch.on` plus `airConditionerMode.heat` |
| Current Heating/Cooling State | `switch` and `airConditionerMode` status |
| Current Temperature | `temperatureMeasurement.temperature`, with a safe fallback if SmartThings omits it |
| Target Temperature | `thermostatCoolingSetpoint.coolingSetpoint` |

Fan speed maps to WindFree and SmartThings fan modes:

| HomeKit rotation speed | SmartThings action |
| --- | --- |
| `0` | `custom.airConditionerOptionalMode.setAcOptionalMode("windFree")` |
| `1-33` | `airConditionerFanMode.setFanMode("low")` |
| `34-66` | `airConditionerFanMode.setFanMode("medium")` or the nearest supported equivalent |
| `67-100` | `airConditionerFanMode.setFanMode("high")` or the nearest supported equivalent |

`Fan Active` off still turns the AC off. Setting rotation speed to `0%` never powers the AC off. If the AC is in SmartThings `auto` mode, WindFree and manual fan-mode writes are skipped with a warning because Samsung commonly rejects those commands in auto mode.

## Logs and Troubleshooting

The plugin logs useful discovery decisions at info level:

- received SmartThings device count;
- every discovered device label, ID, and type;
- collected capabilities;
- AC hints;
- filter matches and skips;
- missing required capabilities;
- add/restore accessory decisions.

If no accessory appears, check for:

```text
Missing capabilities: [...]
Found capabilities: [...]
Available devices: [...]
```

Common fixes:

- Use `deviceId` from the Homebridge UI discovery result.
- Confirm the AC is online in SmartThings.
- Disable optional services not supported by your model.
- Re-run OAuth setup if the refresh token was revoked.
- Use PAT auth temporarily to isolate OAuth issues.
- Enable `debug` for more detail, then disable it after diagnosis.

Never paste unsanitized logs into public issues. Remove SmartThings tokens, OAuth secrets, authorization codes, refresh tokens, and full Homebridge config files.

## Homebridge Child Bridge

Run this plugin as a Homebridge Child Bridge. Samsung custom capabilities and SmartThings responses can vary by model, firmware, and region; a child bridge isolates restarts and failures from the main Homebridge process.

## Homebridge Plugin Catalog

After the first npm publish, the plugin can appear in Homebridge UI plugin search because the package is public, unscoped, and includes the `homebridge-plugin` npm keyword.

Catalog readiness checklist:

- publish `homebridge-smartthings-windfree-ac` to npm;
- keep the package public and unscoped;
- keep the `homebridge-plugin` keyword in `package.json`;
- keep `config.schema.json` and `homebridge-ui` in the npm package;
- keep `main` pointing to `dist/index.js`;
- create a GitHub release for every npm release.

Homebridge Verified is a separate manual review. After the first live-tested npm release, request verification in the [Homebridge plugin registry](https://github.com/homebridge/plugins) and include the npm package name, GitHub repository, release version, and CI evidence for Node.js 22 and 24.

## Development

```bash
npm ci
npm run lint
npm run build
npm test
npm run pack:dry-run
```

Use the combined gate before commits and releases:

```bash
npm run verify
```

The package must pass:

- ESLint;
- TypeScript build;
- Vitest unit tests;
- npm package dry-run with `dist/index.js`, `config.schema.json`, `homebridge-ui`, `README.md`, and `LICENSE`.

## Release

1. Run `npm run verify`.
2. Update `package.json` and `package-lock.json` versions.
3. Merge to `main`.
4. Create a GitHub release tag matching the package version, for example `v0.1.0-beta.1`.
5. The `Publish` workflow runs verification and publishes prereleases with npm tag `beta` and stable releases with npm tag `latest`.

The publish workflow requires an `NPM_TOKEN` repository secret with permission to publish `homebridge-smartthings-windfree-ac`.

## Security

The plugin must never log PATs, OAuth client secrets, authorization codes, access tokens, or refresh tokens.

After live testing, revoke temporary PATs and rotate any client secrets used during setup.
