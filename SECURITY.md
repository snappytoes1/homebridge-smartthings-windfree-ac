# Security Policy

## Supported Versions

Only the latest published version is supported while the plugin is pre-1.0.

## Credential Scope

This plugin can use either SmartThings OAuth2 credentials or a temporary SmartThings Personal Access Token. Prefer OAuth2 for normal use.

Never share:

- SmartThings Personal Access Tokens;
- OAuth client secrets;
- authorization codes;
- access tokens;
- refresh tokens;
- full Homebridge config files.

## Reporting a Vulnerability

Please open a private GitHub security advisory or contact the maintainer directly through GitHub.

Do not include SmartThings Personal Access Tokens, OAuth client secrets, authorization codes, access tokens, refresh tokens, or full Homebridge config files in public issues.

## Secret Handling

The plugin is designed to avoid logging secrets. If you see a token, client secret, authorization code, or refresh token in logs, treat it as a security bug and revoke the exposed credential immediately.

## After Testing

After live setup or troubleshooting:

- revoke temporary PATs;
- rotate OAuth client secrets that were shared during setup;
- remove old authorization codes from notes, screenshots, and issue drafts;
- disable debug logging unless it is actively needed.
