import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateLlmsTxt } from '../tools/llms-txt-generator.mjs';

describe('llms-txt-generator', () => {
  it('generates llms.txt from package data', () => {
    const content = generateLlmsTxt({ name: 'test-app', description: 'A test app' });
    assert.ok(content.includes('# test-app'));
    assert.ok(content.includes('A test app'));
  });

  it('includes dependencies when provided', () => {
    const content = generateLlmsTxt({ name: 'app', description: 'Desc', dependencies: { react: '^18' } });
    assert.ok(content.includes('react'));
  });

  it('returns minimal output with only name', () => {
    const content = generateLlmsTxt({ name: 'minimal' });
    assert.ok(content.includes('# minimal'));
  });

  it('includes homepage link when provided', () => {
    const content = generateLlmsTxt({ name: 'app', homepage: 'https://example.com' });
    assert.ok(content.includes('https://example.com'));
  });
});
