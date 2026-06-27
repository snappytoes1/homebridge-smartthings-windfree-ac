import { describe, expect, it } from 'vitest';

import { normalizeConfig } from '../src/config.js';
import { maskConfig, maskSecret, redactSecrets } from '../src/secrets.js';

describe('config normalization', () => {
  it('normalizes modern PAT config', () => {
    const result = normalizeConfig({
      platform: 'SmartThingsWindFreeAC',
      name: 'AC',
      baseUrl: 'https://api.smartthings.com/v1/',
      authMethod: 'pat',
      accessToken: 'token',
    });

    expect(result.errors).toEqual([]);
    expect(result.config.baseUrl).toBe('https://api.smartthings.com/v1');
    expect(result.config.exposeWindFree).toBe(true);
  });

  it('rejects legacy keys', () => {
    const result = normalizeConfig({
      platform: 'SmartThingsWindFreeAC',
      BaseURL: 'https://api.smartthings.com/v1',
      AccessToken: 'old',
    });

    expect(result.errors.join(' ')).toContain('Legacy config keys are not supported');
  });

  it('requires OAuth credentials', () => {
    const result = normalizeConfig({
      platform: 'SmartThingsWindFreeAC',
      authMethod: 'oauth2',
    });

    expect(result.errors).toContain('clientId is required when authMethod is "oauth2".');
    expect(result.errors).toContain('clientSecret is required when authMethod is "oauth2".');
    expect(result.errors).toContain('refreshToken is required when authMethod is "oauth2". Use the Homebridge UI helper to create one.');
  });
});

describe('secret masking', () => {
  it('masks short and long secrets', () => {
    expect(maskSecret('short')).toBe('********');
    expect(maskSecret('abcd1234wxyz')).toBe('abcd...wxyz');
  });

  it('masks config secret fields', () => {
    expect(maskConfig({ accessToken: 'abcd1234wxyz', name: 'AC' })).toEqual({
      accessToken: 'abcd...wxyz',
      name: 'AC',
    });
  });

  it('redacts token-like error messages', () => {
    expect(redactSecrets('Bearer abc.def access_token=secret')).toBe('Bearer [redacted] access_token=[redacted]');
  });
});
