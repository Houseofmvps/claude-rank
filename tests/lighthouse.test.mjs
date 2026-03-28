import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// We can't test actual Lighthouse execution without Chrome,
// but we can test the availability check and rule definitions.

describe('Lighthouse scanner', () => {
  it('exports isAvailable function', async () => {
    const mod = await import('../tools/lighthouse-scanner.mjs');
    assert.equal(typeof mod.isAvailable, 'function');
  });

  it('isAvailable returns object with available boolean', async () => {
    const mod = await import('../tools/lighthouse-scanner.mjs');
    const result = mod.isAvailable();
    assert.equal(typeof result.available, 'boolean');
    if (!result.available) {
      assert.equal(typeof result.reason, 'string');
      assert.ok(result.reason.includes('Lighthouse'));
    }
  });

  it('exports runLighthouse function', async () => {
    const mod = await import('../tools/lighthouse-scanner.mjs');
    assert.equal(typeof mod.runLighthouse, 'function');
  });

  it('runLighthouse returns unavailable status when Chrome not found', async () => {
    const mod = await import('../tools/lighthouse-scanner.mjs');
    const check = mod.isAvailable();
    if (!check.available) {
      const result = mod.runLighthouse('https://example.com');
      assert.equal(result.available, false);
      assert.equal(result.metrics, null);
      assert.deepEqual(result.findings, []);
      assert.equal(result.scores.performance, null);
    }
  });
});
