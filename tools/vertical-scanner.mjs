/**
 * vertical-scanner.mjs — E-Commerce and Local Business SEO scanner.
 * Auto-detects site type and runs specialized checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// E-commerce detection signals
// Strong e-commerce signals (3 points each) — unique to shopping sites
const ECOMMERCE_STRONG_SIGNALS = [
  'add to cart', 'add-to-cart', 'addtocart', 'buy now', 'checkout',
  'shopping cart', 'shop now', '/product/', '/products/',
  'sku', 'in stock', 'out of stock',
  'add to bag', 'add to basket', 'wishlist',
];

// Weak e-commerce signals (1 point each) — also appear on SaaS pricing pages
const ECOMMERCE_WEAK_SIGNALS = [
  'product', 'price',
];

// Local business detection signals
const LOCAL_SIGNALS = [
  'directions', 'get directions', 'opening hours', 'business hours',
  'visit us', 'our location', 'come visit', 'walk-in',
  'google.com/maps', 'maps.google', 'goo.gl/maps',
];

const ECOMMERCE_RULES = {
  'missing-product-schema':       { severity: 'high', deduction: 10 },
  'missing-offer-schema':         { severity: 'high', deduction: 10 },
  'missing-aggregate-rating':     { severity: 'medium', deduction: 5 },
  'missing-review-schema':        { severity: 'medium', deduction: 5 },
  'missing-product-images':       { severity: 'medium', deduction: 5 },
  'thin-product-description':     { severity: 'medium', deduction: 5 },
  'missing-breadcrumb-ecom':      { severity: 'medium', deduction: 5 },
  'missing-price-on-page':        { severity: 'high', deduction: 10 },
  'no-product-availability':      { severity: 'medium', deduction: 5 },
  'duplicate-product-description':{ severity: 'high', deduction: 10 },
};

const LOCAL_RULES = {
  'missing-local-schema':         { severity: 'high', deduction: 10 },
  'missing-nap-schema':           { severity: 'high', deduction: 10 },
  'missing-geo-coordinates':      { severity: 'medium', deduction: 5 },
  'missing-opening-hours':        { severity: 'medium', deduction: 5 },
  'no-google-maps':               { severity: 'medium', deduction: 5 },
  'no-clickable-phone':           { severity: 'medium', deduction: 5 },
  'no-local-keywords-title':      { severity: 'medium', deduction: 5 },
  'missing-address-element':      { severity: 'low', deduction: 2 },
  'no-service-area-pages':        { severity: 'low', deduction: 2 },
  'missing-local-review-schema':  { severity: 'medium', deduction: 5 },
};

function extractSchemaTypes(jsonLdContent) {
  const types = new Set();
  const allData = [];
  for (const raw of jsonLdContent) {
    try {
      const data = JSON.parse(raw);
      allData.push(data);
      function walk(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(walk); return; }
        if (obj['@type']) {
          const t = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
          t.forEach(type => types.add(type));
        }
        Object.values(obj).forEach(v => { if (v && typeof v === 'object') walk(v); });
      }
      walk(data);
    } catch { /* skip */ }
  }
  return { types, allData };
}

function detectSiteType(htmlFiles, rootDir) {
  let ecomScore = 0;
  let localScore = 0;

  for (const filePath of htmlFiles.slice(0, 10)) { // Sample first 10 pages
    let content;
    try {
      const sizeCheck = checkFileSize(filePath, fs.statSync);
      if (!sizeCheck.ok) continue;
      content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    } catch { continue; }

    let pageHasStrongSignal = false;
    for (const signal of ECOMMERCE_STRONG_SIGNALS) {
      if (content.includes(signal)) { ecomScore += 3; pageHasStrongSignal = true; }
    }
    // Weak signals only count if a strong signal is also on this page
    if (pageHasStrongSignal) {
      for (const signal of ECOMMERCE_WEAK_SIGNALS) {
        if (content.includes(signal)) ecomScore++;
      }
    }
    for (const signal of LOCAL_SIGNALS) {
      if (content.includes(signal)) localScore++;
    }

    // Schema-based detection — only count if NOT SoftwareApplication (SaaS uses Offer legitimately)
    const hasSaasSchema = content.includes('"softwareapplication"');
    if (!hasSaasSchema && (content.includes('"@type":"product"') || content.includes('"@type": "product"'))) ecomScore += 5;
    if (!hasSaasSchema && (content.includes('"@type":"offer"') || content.includes('"@type": "offer"'))) ecomScore += 3;
    if (content.includes('"localbusiness"') || content.includes('"restaurant"') ||
        content.includes('"dentist"') || content.includes('"medicalclinic"')) localScore += 5;

    // URL-based detection
    const rel = path.relative(rootDir, filePath).toLowerCase();
    if (rel.includes('product') || rel.includes('shop') || rel.includes('store')) ecomScore += 3;
    if (rel.includes('location') || rel.includes('contact') || rel.includes('visit')) localScore += 2;
  }

  const types = [];
  if (ecomScore >= 10) types.push('ecommerce');
  if (localScore >= 5) types.push('local');
  return types;
}

function runEcommerceChecks(htmlFiles, rootDir) {
  const findings = [];
  const firedRules = new Set();
  const RULES = ECOMMERCE_RULES;

  function add(rule, message) {
    if (firedRules.has(rule)) return;
    firedRules.add(rule);
    findings.push({ rule, severity: RULES[rule].severity, message });
  }

  let hasProductSchema = false;
  let hasOfferSchema = false;
  let hasRating = false;
  let hasReview = false;
  let hasBreadcrumb = false;
  const descriptions = [];
  let productPageCount = 0;

  for (const filePath of htmlFiles) {
    let content;
    try {
      const sizeCheck = checkFileSize(filePath, fs.statSync);
      if (!sizeCheck.ok) continue;
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    const state = parseHtml(content);
    const lower = content.toLowerCase();
    const { types, allData } = extractSchemaTypes(state.jsonLdContent);

    const isProductPage = lower.includes('add to cart') || lower.includes('buy now') ||
                          types.has('Product') || path.relative(rootDir, filePath).toLowerCase().includes('product');

    if (!isProductPage) continue;
    productPageCount++;

    if (types.has('Product')) hasProductSchema = true;
    if (types.has('Offer') || allData.some(d => JSON.stringify(d).includes('"offers"'))) hasOfferSchema = true;
    if (types.has('AggregateRating') || allData.some(d => JSON.stringify(d).includes('"aggregateRating"'))) hasRating = true;
    if (types.has('Review')) hasReview = true;
    if (types.has('BreadcrumbList')) hasBreadcrumb = true;

    // Check price on page
    if (!(/\$[\d,.]+|€[\d,.]+|£[\d,.]+|¥[\d,.]+|\d+\.\d{2}/.test(content))) {
      add('missing-price-on-page', 'Product page has no visible price — users and search engines expect clear pricing');
    }

    // Product images
    if (state.imageCount === 0) {
      add('missing-product-images', 'Product page has no images — product images are critical for e-commerce SEO');
    }

    // Thin description
    const wordCount = state.mainContentWordCount || state.wordCount;
    if (wordCount < 150) {
      add('thin-product-description', `Product page has only ${wordCount} words — product descriptions should be 150+ words for SEO`);
    }

    // Availability
    if (!lower.includes('in stock') && !lower.includes('out of stock') && !lower.includes('available') && !lower.includes('availability')) {
      add('no-product-availability', 'No product availability status found — Google requires availability for Product rich results');
    }

    // Collect descriptions for duplicate check
    const desc = (state.metaDescriptionText || '').toLowerCase().trim();
    if (desc) descriptions.push({ desc, file: path.relative(rootDir, filePath) });
  }

  if (productPageCount === 0) return { findings: [], score: 100 };

  if (!hasProductSchema) add('missing-product-schema', 'No Product schema found — Product JSON-LD is required for Google Shopping and rich results');
  if (!hasOfferSchema) add('missing-offer-schema', 'No Offer schema found — Offer data (price, currency, availability) enables rich product results');
  if (!hasRating) add('missing-aggregate-rating', 'No AggregateRating schema — star ratings in search results increase CTR by up to 35%');
  if (!hasReview) add('missing-review-schema', 'No Review schema — individual reviews increase trust signals and rich result eligibility');
  if (!hasBreadcrumb) add('missing-breadcrumb-ecom', 'No BreadcrumbList schema — breadcrumbs show category hierarchy in search results');

  // Duplicate descriptions
  if (descriptions.length > 1) {
    const descMap = new Map();
    for (const { desc, file } of descriptions) {
      if (!descMap.has(desc)) descMap.set(desc, []);
      descMap.get(desc).push(file);
    }
    for (const [, files] of descMap) {
      if (files.length > 1) {
        add('duplicate-product-description', `${files.length} product pages share identical meta descriptions — each product needs unique copy`);
        break;
      }
    }
  }

  // Score
  let score = 100;
  for (const f of findings) {
    score -= RULES[f.rule]?.deduction || 0;
  }

  return { findings, score: Math.max(0, score), productPageCount };
}

function runLocalChecks(htmlFiles, rootDir) {
  const findings = [];
  const firedRules = new Set();
  const RULES = LOCAL_RULES;

  function add(rule, message) {
    if (firedRules.has(rule)) return;
    firedRules.add(rule);
    findings.push({ rule, severity: RULES[rule].severity, message });
  }

  let hasLocalSchema = false;
  let hasNap = false;
  let hasGeo = false;
  let hasHours = false;
  let hasGoogleMaps = false;
  let hasClickablePhone = false;
  let hasLocalKeywords = false;
  let hasAddress = false;
  let hasServicePages = false;
  let hasRating = false;

  for (const filePath of htmlFiles) {
    let content;
    try {
      const sizeCheck = checkFileSize(filePath, fs.statSync);
      if (!sizeCheck.ok) continue;
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    const state = parseHtml(content);
    const lower = content.toLowerCase();
    const { types, allData } = extractSchemaTypes(state.jsonLdContent);
    const schemaStr = JSON.stringify(allData);

    // Schema checks
    const localTypes = ['LocalBusiness', 'Restaurant', 'Dentist', 'MedicalClinic', 'Store',
                        'AutoRepair', 'BarberShop', 'BeautySalon', 'LegalService', 'RealEstateAgent',
                        'Plumber', 'Electrician', 'HVACBusiness', 'RoofingContractor'];
    if (localTypes.some(t => types.has(t))) hasLocalSchema = true;
    if (schemaStr.includes('"address"') && schemaStr.includes('"name"')) hasNap = true;
    if (schemaStr.includes('"geo"') || schemaStr.includes('"latitude"')) hasGeo = true;
    if (schemaStr.includes('"openingHours"') || schemaStr.includes('"OpeningHoursSpecification"')) hasHours = true;
    if (types.has('AggregateRating') || schemaStr.includes('"aggregateRating"')) hasRating = true;

    // Page content checks
    if (lower.includes('google.com/maps') || lower.includes('maps.google') || lower.includes('goo.gl/maps')) hasGoogleMaps = true;
    if (lower.includes('tel:')) hasClickablePhone = true;
    if (/<address/i.test(content)) hasAddress = true;

    // Local keywords in title
    const title = (state.titleText || '').toLowerCase();
    const cityPatterns = /\b(near me|in \w+|local|\w+\s+(city|county|area|region))\b/i;
    if (cityPatterns.test(title)) hasLocalKeywords = true;

    // Service area pages
    const rel = path.relative(rootDir, filePath).toLowerCase();
    if (rel.includes('service') || rel.includes('area') || rel.includes('location')) hasServicePages = true;
  }

  if (!hasLocalSchema) add('missing-local-schema', 'No LocalBusiness schema found — LocalBusiness JSON-LD is essential for local search visibility');
  if (!hasNap) add('missing-nap-schema', 'No NAP (Name, Address, Phone) in structured data — NAP consistency is the #1 local ranking factor');
  if (!hasGeo) add('missing-geo-coordinates', 'No GeoCoordinates in schema — geo coordinates help search engines place your business on maps');
  if (!hasHours) add('missing-opening-hours', 'No opening hours in schema — business hours improve local pack visibility and user experience');
  if (!hasGoogleMaps) add('no-google-maps', 'No Google Maps embed detected — a map helps users find your location and signals relevance to local search');
  if (!hasClickablePhone) add('no-clickable-phone', 'No clickable tel: link found — mobile users expect tap-to-call phone numbers');
  if (!hasLocalKeywords) add('no-local-keywords-title', 'No local keywords in page titles — include city/area names in titles for local SEO');
  if (!hasAddress) add('missing-address-element', 'No <address> HTML element found — semantic address markup helps search engines extract location data');
  if (!hasServicePages) add('no-service-area-pages', 'No service area pages detected — create pages for each service area to capture local search traffic');
  if (!hasRating) add('missing-local-review-schema', 'No AggregateRating schema — review stars in local search results increase click-through by 25%');

  let score = 100;
  for (const f of findings) {
    score -= RULES[f.rule]?.deduction || 0;
  }

  return { findings, score: Math.max(0, score) };
}

export function scanDirectory(rootDir) {
  const absRoot = path.resolve(rootDir);
  const htmlFiles = findHtmlFiles(absRoot);

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  const siteTypes = detectSiteType(htmlFiles, absRoot);
  const result = {
    files_scanned: htmlFiles.length,
    detected_types: siteTypes,
    ecommerce: null,
    local: null,
  };

  if (siteTypes.includes('ecommerce')) {
    result.ecommerce = runEcommerceChecks(htmlFiles, absRoot);
  }

  if (siteTypes.includes('local')) {
    result.local = runLocalChecks(htmlFiles, absRoot);
  }

  if (siteTypes.length === 0) {
    result.message = 'No e-commerce or local business signals detected. This scanner is most useful for product/service sites with physical locations.';
  }

  return result;
}

// CLI
const args = process.argv.slice(2);
if (args.length > 0) {
  const result = scanDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
