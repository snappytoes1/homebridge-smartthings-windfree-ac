# Security Policy

## Supported Versions

Only the latest published version is supported while the plugin is pre-1.0.

## Reporting a Vulnerability

Please open a private GitHub security advisory or contact the maintainer directly through GitHub.

Do not include SmartThings Personal Access Tokens, OAuth client secrets, authorization codes, access tokens, refresh tokens, or full Homebridge config files in public issues.

## Secret Handling

The plugin is designed to avoid logging secrets. If you see a token, client secret, authorization code, or refresh token in logs, treat it as a security bug and revoke the exposed credential immediately.
