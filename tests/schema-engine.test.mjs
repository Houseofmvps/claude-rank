import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectSchema, validateSchema, generateSchema, injectSchema } from '../tools/schema-engine.mjs';

describe('detectSchema', () => {
  it('finds JSON-LD in HTML', () => {
    const html = '<script type="application/ld+json">{"@type":"Organization","name":"Test"}</script>';
    const schemas = detectSchema(html);
    assert.equal(schemas.length, 1);
    assert.equal(schemas[0].type, 'Organization');
  });

  it('finds multiple schema blocks', () => {
    const html = '<script type="application/ld+json">{"@type":"Organization"}</script><script type="application/ld+json">{"@type":"FAQPage"}</script>';
    const schemas = detectSchema(html);
    assert.equal(schemas.length, 2);
  });

  it('handles malformed JSON gracefully', () => {
    const html = '<script type="application/ld+json">{broken json</script>';
    const schemas = detectSchema(html);
    assert.equal(schemas.length, 0);
  });
});

describe('validateSchema', () => {
  it('flags missing required fields for Organization', () => {
    const schema = { '@type': 'Organization' };
    const issues = validateSchema(schema);
    assert.ok(issues.some(i => i.includes('name')));
  });

  it('passes valid Organization schema', () => {
    const schema = { '@type': 'Organization', 'name': 'Test', 'url': 'https://test.com' };
    const issues = validateSchema(schema);
    assert.equal(issues.length, 0);
  });

  it('flags missing fields for Article', () => {
    const schema = { '@type': 'Article' };
    const issues = validateSchema(schema);
    assert.ok(issues.length > 0);
  });

  it('passes valid Product schema', () => {
    const schema = { '@type': 'Product', 'name': 'Widget', 'description': 'A widget' };
    const issues = validateSchema(schema);
    assert.equal(issues.length, 0);
  });
});

describe('generateSchema', () => {
  it('generates Organization schema', () => {
    const schema = generateSchema('Organization', { name: 'Test Corp', url: 'https://test.com' });
    assert.equal(schema['@context'], 'https://schema.org');
    assert.equal(schema['@type'], 'Organization');
    assert.equal(schema.name, 'Test Corp');
  });

  it('generates FAQPage schema from Q&A pairs', () => {
    const schema = generateSchema('FAQPage', {
      questions: [{ q: 'What is SEO?', a: 'SEO is search engine optimization.' }]
    });
    assert.equal(schema['@type'], 'FAQPage');
    assert.ok(schema.mainEntity.length > 0);
    assert.equal(schema.mainEntity[0]['@type'], 'Question');
  });

  it('generates LocalBusiness schema', () => {
    const schema = generateSchema('LocalBusiness', {
      name: 'Test Biz', address: '123 Main St', telephone: '+1234567890'
    });
    assert.equal(schema['@type'], 'LocalBusiness');
    assert.equal(schema.name, 'Test Biz');
  });

  it('generates Article schema', () => {
    const schema = generateSchema('Article', {
      headline: 'Test Article', author: 'Jane', datePublished: '2026-01-01'
    });
    assert.equal(schema['@type'], 'Article');
    assert.equal(schema.headline, 'Test Article');
  });

  it('generates WebSite with SearchAction', () => {
    const schema = generateSchema('WebSite', { name: 'Example', url: 'https://example.com' });
    assert.equal(schema['@type'], 'WebSite');
    assert.ok(schema.potentialAction);
  });
});

describe('injectSchema', () => {
  it('injects schema before </head>', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const schema = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Test' };
    const result = injectSchema(html, schema);
    assert.ok(result.includes('application/ld+json'));
    assert.ok(result.includes('"Organization"'));
    assert.ok(result.indexOf('ld+json') < result.indexOf('</head>'));
  });

  it('handles HTML without </head>', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const schema = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Test' };
    const result = injectSchema(html, schema);
    assert.ok(result.includes('application/ld+json'));
  });
});
