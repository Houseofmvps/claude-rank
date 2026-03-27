import { findHtmlFiles } from './lib/html-parser.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Detect all JSON-LD schema blocks in an HTML string.
 * Returns array of { type, data, raw } objects. Silently skips malformed JSON.
 */
export function detectSchema(html) {
  const results = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const data = JSON.parse(raw);
      const type = data['@type'] || null;
      results.push({ type, data, raw });
    } catch {
      // silently skip malformed JSON
    }
  }
  return results;
}

/**
 * Validate a schema object against required fields per type.
 * Returns array of issue strings. Empty array = valid.
 */
export function validateSchema(schemaObj) {
  const issues = [];
  const type = schemaObj['@type'];

  if (!type) {
    issues.push('Missing @type field');
    return issues;
  }

  const requiredFields = {
    Organization: ['name', 'url'],
    Article: ['headline', 'author', 'datePublished'],
    BlogPosting: ['headline', 'author', 'datePublished'],
    NewsArticle: ['headline', 'author', 'datePublished'],
    Product: ['name', 'description'],
    FAQPage: ['mainEntity'],
    HowTo: ['name', 'step'],
    LocalBusiness: ['name', 'address'],
    Person: ['name'],
    WebSite: ['name', 'url'],
    BreadcrumbList: ['itemListElement'],
    SoftwareApplication: ['name'],
    VideoObject: ['name', 'description', 'uploadDate'],
    ItemList: ['itemListElement'],
  };

  const fields = requiredFields[type];
  if (!fields) {
    // Unknown type — no required field rules
    return issues;
  }

  for (const field of fields) {
    if (schemaObj[field] === undefined || schemaObj[field] === null || schemaObj[field] === '') {
      issues.push(`Missing required field: ${field}`);
    }
  }

  // SoftwareApplication: requires operatingSystem OR applicationCategory
  if (type === 'SoftwareApplication') {
    if (!schemaObj.operatingSystem && !schemaObj.applicationCategory) {
      issues.push('Missing required field: operatingSystem or applicationCategory');
    }
  }

  // FAQPage: mainEntity must be an array with Question items
  if (type === 'FAQPage' && Array.isArray(schemaObj.mainEntity)) {
    for (let i = 0; i < schemaObj.mainEntity.length; i++) {
      const item = schemaObj.mainEntity[i];
      if (item['@type'] !== 'Question') {
        issues.push(`mainEntity[${i}] must be of @type Question`);
      }
    }
  }

  return issues;
}

/**
 * Generate a valid JSON-LD schema object for the given type and data.
 * Always includes @context: "https://schema.org".
 */
export function generateSchema(type, data = {}) {
  const base = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  switch (type) {
    case 'Organization': {
      const schema = { ...base, name: data.name, url: data.url };
      if (data.logo) schema.logo = data.logo;
      if (data.description) schema.description = data.description;
      if (data.sameAs) schema.sameAs = data.sameAs;
      return schema;
    }

    case 'FAQPage': {
      const questions = (data.questions || []).map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: a,
        },
      }));
      return { ...base, mainEntity: questions };
    }

    case 'Article':
    case 'BlogPosting':
    case 'NewsArticle': {
      const schema = {
        ...base,
        '@type': type,
        headline: data.headline,
        author: typeof data.author === 'string'
          ? { '@type': 'Person', name: data.author }
          : data.author,
        datePublished: data.datePublished,
      };
      if (data.image) schema.image = data.image;
      if (data.publisher) schema.publisher = data.publisher;
      return schema;
    }

    case 'Product': {
      const schema = { ...base, name: data.name, description: data.description };
      if (data.sku) schema.sku = data.sku;
      if (data.price !== undefined || data.currency) {
        schema.offers = {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: data.currency || 'USD',
          availability: data.availability || 'https://schema.org/InStock',
        };
      }
      return schema;
    }

    case 'LocalBusiness': {
      const schema = { ...base, name: data.name, address: data.address };
      if (data.telephone) schema.telephone = data.telephone;
      if (data.openingHours) schema.openingHours = data.openingHours;
      if (data.geo) schema.geo = data.geo;
      return schema;
    }

    case 'Person': {
      const schema = { ...base, name: data.name };
      if (data.jobTitle) schema.jobTitle = data.jobTitle;
      if (data.url) schema.url = data.url;
      if (data.sameAs) schema.sameAs = data.sameAs;
      return schema;
    }

    case 'WebSite': {
      return {
        ...base,
        name: data.name,
        url: data.url,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${data.url}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };
    }

    case 'BreadcrumbList': {
      const items = (data.items || []).map((item, index) => ({
        '@type': 'ListItem',
        position: item.position !== undefined ? item.position : index + 1,
        name: item.name,
        item: item.url,
      }));
      return { ...base, itemListElement: items };
    }

    case 'HowTo': {
      const steps = (data.steps || []).map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      }));
      return { ...base, name: data.name, step: steps };
    }

    case 'SoftwareApplication': {
      const schema = { ...base, name: data.name };
      if (data.operatingSystem) schema.operatingSystem = data.operatingSystem;
      if (data.applicationCategory) schema.applicationCategory = data.applicationCategory;
      if (data.price !== undefined) {
        schema.offers = {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: data.currency || 'USD',
        };
      }
      return schema;
    }

    case 'VideoObject': {
      const schema = {
        ...base,
        name: data.name,
        description: data.description,
        uploadDate: data.uploadDate,
      };
      if (data.thumbnailUrl) schema.thumbnailUrl = data.thumbnailUrl;
      return schema;
    }

    case 'ItemList': {
      const items = (data.items || []).map((item, index) => ({
        '@type': 'ListItem',
        position: item.position !== undefined ? item.position : index + 1,
        name: item.name,
        ...(item.url ? { url: item.url } : {}),
      }));
      return { ...base, itemListElement: items };
    }

    default: {
      // Generic fallback — spread all data fields
      return { ...base, ...data };
    }
  }
}

/**
 * Inject a JSON-LD script tag into HTML content.
 * Inserts before </head>, then </body>, then appends to end.
 */
export function injectSchema(htmlContent, schemaObj) {
  const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`;

  if (htmlContent.includes('</head>')) {
    return htmlContent.replace('</head>', `${scriptTag}\n</head>`);
  }

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${scriptTag}\n</body>`);
  }

  return htmlContent + '\n' + scriptTag;
}

// --- CLI ---
const args = process.argv.slice(2);

if (args[0] === 'detect' && args[1]) {
  const dir = resolve(args[1]);
  const files = findHtmlFiles(dir);
  const results = [];

  for (const file of files) {
    const html = readFileSync(file, 'utf-8');
    const schemas = detectSchema(html);
    if (schemas.length > 0) {
      results.push({ file, schemas });
    }
  }

  console.log(JSON.stringify(results, null, 2));
} else if (args[0] === 'generate' && args[1]) {
  const type = args[1];
  const data = {};

  for (const arg of args.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) {
      const key = m[1];
      const value = m[2];
      data[key] = value;
    }
  }

  const schema = generateSchema(type, data);
  console.log(JSON.stringify(schema, null, 2));
}
