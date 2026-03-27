/**
 * sitemap-analyzer.mjs — Generate sitemaps and discover routes from HTML files.
 * Supports Next.js app/pages router and static HTML builds.
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// generateSitemap
// ---------------------------------------------------------------------------

/**
 * Generate a valid sitemap XML string.
 * Deduplicates paths and always includes the root URL.
 * @param {string} baseUrl
 * @param {string[]} paths
 * @returns {string}
 */
export function generateSitemap(baseUrl, paths) {
  // Normalize base URL: remove trailing slash
  const base = baseUrl.replace(/\/$/, '');

  // Always include root, deduplicate
  const allPaths = ['/', ...paths];
  const seen = new Set();
  const uniquePaths = [];

  for (const p of allPaths) {
    // Normalize: ensure leading slash
    const normalized = p.startsWith('/') ? p : `/${p}`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniquePaths.push(normalized);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const urlEntries = uniquePaths.map((p) => {
    const loc = `${base}${p}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// findRoutes
// ---------------------------------------------------------------------------

/**
 * Recursively collect all .html files under a directory.
 * @param {string} dir
 * @param {string} rootDir
 * @param {string[]} acc
 * @returns {string[]}
 */
function collectHtmlFiles(dir, rootDir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden dirs
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      collectHtmlFiles(fullPath, rootDir, acc);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      acc.push(fullPath);
    }
  }

  return acc;
}

/**
 * Convert a file path to a URL path.
 * index.html → /
 * about/index.html → /about/
 * about.html → /about
 * @param {string} filePath relative path from search root
 * @returns {string}
 */
function filePathToRoute(filePath) {
  // Normalize separators
  const normalized = filePath.replace(/\\/g, '/');
  // Strip .html
  let route = normalized.replace(/\.html$/, '');
  // index → directory
  if (route === 'index') return '/';
  if (route.endsWith('/index')) return route.slice(0, -'index'.length);
  return `/${route}`;
}

/**
 * Find routes from a project directory.
 * Auto-detects Next.js app/pages or static HTML in public/dist/build.
 * @param {string} dir
 * @returns {string[]}
 */
export function findRoutes(dir) {
  const absDir = path.resolve(dir);

  // Priority: Next.js app router, then pages router, then static dirs
  const searchRoots = [];

  const appDir = path.join(absDir, 'app');
  const pagesDir = path.join(absDir, 'pages');
  const srcAppDir = path.join(absDir, 'src', 'app');
  const srcPagesDir = path.join(absDir, 'src', 'pages');
  const publicDir = path.join(absDir, 'public');
  const distDir = path.join(absDir, 'dist');
  const buildDir = path.join(absDir, 'build');
  const outDir = path.join(absDir, 'out');

  for (const candidate of [appDir, srcAppDir, pagesDir, srcPagesDir]) {
    if (fs.existsSync(candidate)) {
      searchRoots.push(candidate);
    }
  }

  // Static output dirs
  for (const candidate of [publicDir, distDir, buildDir, outDir]) {
    if (fs.existsSync(candidate)) {
      searchRoots.push(candidate);
    }
  }

  // Fallback: scan root
  if (searchRoots.length === 0) {
    searchRoots.push(absDir);
  }

  const routes = new Set();

  for (const root of searchRoots) {
    const htmlFiles = collectHtmlFiles(root, root);
    for (const file of htmlFiles) {
      const rel = path.relative(root, file);
      const route = filePathToRoute(rel);
      routes.add(route);
    }
  }

  // Also discover Next.js routes from directory structure (page.tsx, page.jsx, page.js)
  for (const candidate of [appDir, srcAppDir]) {
    if (fs.existsSync(candidate)) {
      discoverNextAppRoutes(candidate, candidate, routes);
    }
  }

  return [...routes];
}

/**
 * Discover routes from Next.js App Router (page.tsx / page.jsx / page.js / page.ts)
 * @param {string} dir
 * @param {string} rootDir
 * @param {Set<string>} routes
 */
function discoverNextAppRoutes(dir, rootDir, routes) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      // Skip route groups (parentheses), keep dynamic routes
      discoverNextAppRoutes(fullPath, rootDir, routes);
    } else if (
      entry.isFile() &&
      /^page\.(tsx?|jsx?)$/.test(entry.name)
    ) {
      let rel = path.relative(rootDir, dir).replace(/\\/g, '/');
      // Strip route groups like (marketing)
      rel = rel.replace(/\([^/]+\)\//g, '').replace(/\([^/]+\)$/, '');
      // Replace dynamic segments [slug] with :slug placeholder → keep as-is for sitemap
      const route = rel === '' ? '/' : `/${rel}/`;
      routes.add(route);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [,, command, dir, baseUrl] = process.argv;

  if (command === 'generate') {
    if (!dir || !baseUrl) {
      console.error('Usage: node tools/sitemap-analyzer.mjs generate <dir> <base-url>');
      process.exit(1);
    }

    const absDir = path.resolve(dir);
    const routes = findRoutes(absDir);
    const xml = generateSitemap(baseUrl, routes);
    const outPath = path.join(absDir, 'sitemap.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log(`sitemap.xml written to ${outPath}`);
    console.log(`Routes found: ${routes.join(', ') || '(none beyond root)'}`);
  } else {
    console.error('Usage: node tools/sitemap-analyzer.mjs generate <dir> <base-url>');
    process.exit(1);
  }
}
