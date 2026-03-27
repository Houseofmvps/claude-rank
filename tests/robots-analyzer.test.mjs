import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRobotsTxt, analyzeRobotsTxt } from '../tools/robots-analyzer.mjs';

describe('robots-analyzer', () => {
  it('generates AI-friendly robots.txt', () => {
    const content = generateRobotsTxt('https://example.com');
    assert.ok(content.includes('User-agent: GPTBot'));
    assert.ok(content.includes('Allow: /'));
    assert.ok(content.includes('Sitemap:'));
  });

  it('detects blocked AI bots', () => {
    const analysis = analyzeRobotsTxt('User-agent: GPTBot\nDisallow: /');
    assert.ok(analysis.blockedBots.includes('GPTBot'));
  });

  it('detects allowed AI bots', () => {
    const analysis = analyzeRobotsTxt('User-agent: GPTBot\nAllow: /');
    assert.ok(analysis.allowedBots.includes('GPTBot'));
  });

  it('detects missing Sitemap directive', () => {
    const analysis = analyzeRobotsTxt('User-agent: *\nAllow: /');
    assert.equal(analysis.hasSitemap, false);
  });

  it('detects Sitemap URL', () => {
    const analysis = analyzeRobotsTxt('User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml');
    assert.equal(analysis.hasSitemap, true);
    assert.ok(analysis.sitemapUrls.includes('https://example.com/sitemap.xml'));
  });

  it('handles multiple bot blocks', () => {
    const content = 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: PerplexityBot\nDisallow: /\n\nUser-agent: ClaudeBot\nAllow: /';
    const analysis = analyzeRobotsTxt(content);
    assert.ok(analysis.blockedBots.includes('GPTBot'));
    assert.ok(analysis.blockedBots.includes('PerplexityBot'));
    assert.ok(analysis.allowedBots.includes('ClaudeBot'));
  });
});
