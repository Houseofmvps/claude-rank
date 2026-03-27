import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateUrl, checkFileSize, createResponseAccumulator, redactSensitiveValue } from '../tools/lib/security.mjs';

describe('validateUrl', () => {
  it('allows HTTPS URLs', () => {
    const result = validateUrl('https://example.com');
    assert.equal(result.valid, true);
  });

  it('allows HTTP URLs', () => {
    const result = validateUrl('http://example.com');
    assert.equal(result.valid, true);
  });

  it('blocks private IPs', () => {
    assert.equal(validateUrl('http://127.0.0.1').valid, false);
    assert.equal(validateUrl('http://10.0.0.1').valid, false);
    assert.equal(validateUrl('http://192.168.1.1').valid, false);
    assert.equal(validateUrl('http://169.254.169.254').valid, false);
    assert.equal(validateUrl('http://172.16.0.1').valid, false);
  });

  it('blocks non-HTTP schemes', () => {
    assert.equal(validateUrl('ftp://example.com').valid, false);
    assert.equal(validateUrl('file:///etc/passwd').valid, false);
  });

  it('blocks cloud metadata endpoints', () => {
    assert.equal(validateUrl('http://metadata.google.internal').valid, false);
    assert.equal(validateUrl('http://metadata.google.com').valid, false);
  });

  it('blocks invalid URLs', () => {
    assert.equal(validateUrl('not-a-url').valid, false);
  });
});

describe('checkFileSize', () => {
  it('rejects files over 10MB', () => {
    const mockStat = () => ({ size: 11 * 1024 * 1024 });
    const result = checkFileSize('/fake/path', mockStat);
    assert.equal(result.ok, false);
    assert.ok(result.reason.includes('too large') || result.reason.includes('limit'));
  });

  it('accepts files under 10MB', () => {
    const mockStat = () => ({ size: 1024 });
    const result = checkFileSize('/fake/path', mockStat);
    assert.equal(result.ok, true);
    assert.equal(result.size, 1024);
  });

  it('handles missing files', () => {
    const mockStat = () => { throw new Error('ENOENT'); };
    const result = checkFileSize('/fake/path', mockStat);
    assert.equal(result.ok, false);
  });
});

describe('createResponseAccumulator', () => {
  it('accumulates data within limit', () => {
    const acc = createResponseAccumulator(20);
    acc.onData('hello');
    acc.onData(' world');
    assert.equal(acc.getBody(), 'hello world');
    assert.equal(acc.isTruncated(), false);
  });

  it('caps response at maxSize', () => {
    const acc = createResponseAccumulator(10);
    acc.onData('12345');
    acc.onData('67890');
    acc.onData('extra');
    assert.equal(acc.isTruncated(), true);
    assert.equal(acc.getBody().length, 10);
  });
});

describe('redactSensitiveValue', () => {
  it('redacts API keys', () => {
    const result = redactSensitiveValue('api_key', 'sk_live_abc123');
    assert.ok(result.includes('REDACTED'));
    assert.ok(result.startsWith('sk_l'));
  });

  it('passes through non-sensitive values', () => {
    const result = redactSensitiveValue('name', 'hello');
    assert.equal(result, 'hello');
  });

  it('redacts short secrets completely', () => {
    const result = redactSensitiveValue('token', 'abc');
    assert.equal(result, '***REDACTED***');
  });

  it('handles null/undefined', () => {
    assert.equal(redactSensitiveValue('key', null), null);
    assert.equal(redactSensitiveValue('key', undefined), undefined);
  });
});
