import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateBrief } from '../tools/brief-generator.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'brief-test-'));
}

function writeHtml(dir, filename, html) {
  fs.writeFileSync(path.join(dir, filename), html, 'utf8');
}

// Generate body text about a topic with enough words
function topicText(topic, sentences = 30) {
  const templates = [
    `${topic} is an essential strategy for modern businesses.`,
    `Understanding ${topic} helps you achieve better results.`,
    `The best practices for ${topic} include careful planning and execution.`,
    `Experts recommend focusing on ${topic} for long-term growth.`,
    `Many companies have seen success by investing in ${topic} strategies.`,
    `Research shows that ${topic} can improve performance by 50% or more.`,
    `A comprehensive guide to ${topic} covers fundamentals and advanced techniques.`,
    `When implementing ${topic}, start with a clear plan and measurable goals.`,
    `The future of ${topic} looks promising with new tools and technologies emerging daily.`,
    `Common mistakes in ${topic} include rushing implementation and ignoring best practices.`,
  ];
  const result = [];
  for (let i = 0; i < sentences; i++) {
    result.push(templates[i % templates.length]);
  }
  return result.join(' ');
}

describe('brief-generator', () => {
  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = generateBrief(dir, 'seo');
      assert.equal(result.skipped, true);
      assert.ok(result.reason.includes('No HTML files'));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns skipped when no target keyword provided', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Test</title></head><body><p>Some content here.</p></body></html>`);
    try {
      const result = generateBrief(dir, '');
      assert.equal(result.skipped, true);
      assert.ok(result.reason.includes('No target keyword'));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns correct structure with all expected fields', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>SEO Guide</title></head><body>
      <h1>SEO Optimization Guide</h1>
      <h2>What is SEO</h2>
      <p>${topicText('seo optimization')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo optimization');
      assert.ok(!result.skipped);
      assert.equal(result.targetKeyword, 'seo optimization');
      assert.ok('suggestedTitle' in result);
      assert.ok('targetWordCount' in result);
      assert.ok('avgCompetitorWordCount' in result);
      assert.ok('suggestedOutline' in result);
      assert.ok('questionsToAnswer' in result);
      assert.ok('internalLinkingOpportunities' in result);
      assert.ok('relatedKeywords' in result);
      assert.ok('contentGaps' in result);
      assert.ok('geoOptimizationTips' in result);
      assert.ok('analysis' in result);
      assert.ok(result.analysis.totalPagesScanned >= 1);
      assert.ok(result.analysis.relatedPagesFound >= 1);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('calculates target word count 20% above average of related pages', () => {
    const dir = makeTmpDir();
    // Create two related pages with known word counts
    const text500 = 'word '.repeat(500);
    const text300 = 'word '.repeat(300);
    writeHtml(dir, 'a.html',
      `<!DOCTYPE html><html><head><title>SEO Tips</title></head><body><h1>SEO Tips</h1><p>${text500}</p></body></html>`);
    writeHtml(dir, 'b.html',
      `<!DOCTYPE html><html><head><title>SEO Guide</title></head><body><h1>SEO Guide</h1><p>${text300}</p></body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      // Average of ~500 and ~300 = ~400, +20% = ~480
      assert.ok(result.targetWordCount > result.avgCompetitorWordCount,
        `Target (${result.targetWordCount}) should be > avg (${result.avgCompetitorWordCount})`);
      // Check it's roughly 20% more
      const ratio = result.targetWordCount / result.avgCompetitorWordCount;
      assert.ok(ratio >= 1.15 && ratio <= 1.25,
        `Ratio ${ratio} should be close to 1.2`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('collects H2 suggestions from related pages', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'a.html',
      `<!DOCTYPE html><html><head><title>SEO</title></head><body>
      <h1>SEO Guide</h1>
      <h2>On-Page SEO</h2>
      <h2>Technical SEO</h2>
      <p>${topicText('seo')}</p>
      </body></html>`);
    writeHtml(dir, 'b.html',
      `<!DOCTYPE html><html><head><title>SEO Tips</title></head><body>
      <h1>SEO Tips</h1>
      <h2>Link Building</h2>
      <h2>On-Page SEO</h2>
      <p>${topicText('seo')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      assert.ok(result.suggestedOutline.length >= 2,
        `Expected >= 2 H2 suggestions, got ${result.suggestedOutline.length}`);
      // "On-Page SEO" appears in both pages, should be first (highest frequency)
      const firstH2Lower = result.suggestedOutline[0].toLowerCase();
      assert.ok(firstH2Lower.includes('on-page seo'),
        `Expected first H2 to be the most frequent ("on-page seo"), got "${result.suggestedOutline[0]}"`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('extracts questions from related pages', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'faq.html',
      `<!DOCTYPE html><html><head><title>SEO FAQ</title></head><body>
      <h1>SEO FAQ</h1>
      <h2>What is SEO?</h2>
      <p>SEO stands for search engine optimization and helps websites rank higher.</p>
      <h2>How does SEO work?</h2>
      <p>SEO works by optimizing content and technical factors for search engines.</p>
      <p>${topicText('seo')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      assert.ok(result.questionsToAnswer.length >= 2,
        `Expected >= 2 questions, got ${result.questionsToAnswer.length}`);
      const allQs = result.questionsToAnswer.join(' ').toLowerCase();
      assert.ok(allQs.includes('what is seo') || allQs.includes('how does seo'),
        'Should extract question-format headings');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('identifies internal linking opportunities', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'main.html',
      `<!DOCTYPE html><html><head><title>SEO Basics</title></head><body>
      <h1>SEO Basics</h1>
      <p>${topicText('seo')}</p>
      </body></html>`);
    writeHtml(dir, 'related.html',
      `<!DOCTYPE html><html><head><title>Content Marketing</title></head><body>
      <h1>Content Marketing</h1>
      <p>${topicText('content marketing')} SEO helps content marketing succeed.</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      assert.ok(result.internalLinkingOpportunities.length >= 1,
        `Expected >= 1 linking opportunity, got ${result.internalLinkingOpportunities.length}`);
      const linkFiles = result.internalLinkingOpportunities.map(l => l.file);
      assert.ok(linkFiles.includes('main.html'),
        'Should suggest linking to/from the page mentioning SEO');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('extracts related keywords from related pages', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>SEO Strategy</title></head><body>
      <h1>SEO Strategy</h1>
      <p>${topicText('seo strategy')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      assert.ok(result.relatedKeywords.length >= 1,
        `Expected >= 1 related keyword, got ${result.relatedKeywords.length}`);
      // Each keyword should have word and frequency
      const first = result.relatedKeywords[0];
      assert.ok('word' in first);
      assert.ok('frequency' in first);
      assert.ok(first.frequency >= 1);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('generates GEO optimization tips', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>SEO Guide</title></head><body>
      <h1>SEO Guide</h1>
      <p>${topicText('seo')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      assert.ok(result.geoOptimizationTips.length >= 3,
        `Expected >= 3 GEO tips, got ${result.geoOptimizationTips.length}`);
      // Each tip should have tip, reason, and priority
      const first = result.geoOptimizationTips[0];
      assert.ok('tip' in first);
      assert.ok('reason' in first);
      assert.ok('priority' in first);
      assert.ok(['high', 'medium', 'low'].includes(first.priority));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('generates a suggested title', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>SEO Tips</title></head><body>
      <h1>SEO Tips</h1>
      <p>${topicText('seo')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      assert.ok(result.suggestedTitle.length > 5,
        `Expected a meaningful title, got "${result.suggestedTitle}"`);
      // Title should contain the keyword (capitalized)
      assert.ok(result.suggestedTitle.toLowerCase().includes('seo'),
        `Title should contain the keyword, got "${result.suggestedTitle}"`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects content gaps across related pages', () => {
    const dir = makeTmpDir();
    // Page A covers "basics" and "advanced", page B only covers "basics"
    writeHtml(dir, 'a.html',
      `<!DOCTYPE html><html><head><title>SEO Comprehensive</title></head><body>
      <h1>SEO Comprehensive</h1>
      <h2>SEO Basics</h2>
      <p>${topicText('seo basics')}</p>
      <h2>Advanced SEO Techniques</h2>
      <p>${topicText('advanced seo')}</p>
      </body></html>`);
    writeHtml(dir, 'b.html',
      `<!DOCTYPE html><html><head><title>SEO Starter</title></head><body>
      <h1>SEO Starter</h1>
      <h2>SEO Basics</h2>
      <p>${topicText('seo basics')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'seo');
      // "Advanced SEO Techniques" is only in page A — should show as a gap
      assert.ok(result.contentGaps.length >= 1,
        `Expected >= 1 content gap, got ${result.contentGaps.length}`);
      const gapTopics = result.contentGaps.map(g => g.topic);
      assert.ok(gapTopics.some(t => t.includes('advanced')),
        `Expected gap about "advanced" topic, got: ${gapTopics.join(', ')}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('handles pages unrelated to keyword gracefully', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'cooking.html',
      `<!DOCTYPE html><html><head><title>Cooking Tips</title></head><body>
      <h1>Best Pasta Recipes</h1>
      <p>${topicText('cooking pasta recipes')}</p>
      </body></html>`);
    try {
      const result = generateBrief(dir, 'blockchain');
      assert.ok(!result.skipped);
      assert.equal(result.analysis.relatedPagesFound, 0);
      assert.equal(result.analysis.totalPagesScanned, 1);
      // Should still generate a brief with defaults
      assert.ok(result.targetWordCount >= 1000,
        'Should use default word count when no related pages found');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
