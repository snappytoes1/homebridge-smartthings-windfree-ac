# Changelog

All notable changes to this project will be documented in this file.

This project uses npm package versions and GitHub release tags.

## Unreleased

- Added a guided Homebridge OAuth2 setup flow that opens SmartThings authorization, copies the link, completes code exchange, and discovers devices automatically.
- Updated OAuth requests to SmartThings' current `/v1/oauth` endpoints and token parameters.
- Added strict redirect-result and OAuth state validation, denied-access handling, and serialized refresh-token requests.

## 0.1.0-beta.1 - 2026-06-27

- Initial clean Homebridge dynamic platform plugin for SmartThings WindFree AC devices.
- Added OAuth2 authorization-code setup with refresh token support.
- Added temporary PAT authentication.
- Added custom Homebridge UI for setup, OAuth token exchange, device discovery, optional services, and debug logging.
- Added SmartThings device discovery across all components and capabilities.
- Added Thermostat support for power, AC mode, current temperature, and cooling setpoint.
- Added optional HomeKit controls for WindFree, Display, Auto Clean, Swing, and Fan.
- Added secret masking, timeout/retry behavior, unit tests, CI, release workflow, and package dry-run validation.
- Clamped SmartThings cooling setpoint reads to the HomeKit target temperature range.
- Queued SmartThings device commands and added bounded retry/backoff for `429 Too Many Requests` responses.
- Coalesced SmartThings status reads with a short cache to avoid startup `GET /status` rate limits.
- Respected supported SmartThings AC fan modes and skipped invalid fan-mode writes in off/auto states.
- Added structured package author metadata for Homebridge UI plugin cards.
- Replaced the separate WindFree switch with deliberate HomeKit Fan speed `0%` WindFree control.
