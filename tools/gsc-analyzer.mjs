/**
 * gsc-analyzer.mjs — Google Search Console data integration.
 * Reads GSC performance export CSV and correlates with site audit.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse a GSC Performance CSV export.
 * GSC exports have columns: Top queries/Pages, Clicks, Impressions, CTR, Position
 * @param {string} csvPath — path to exported CSV file
 * @returns {object} parsed GSC data
 */
export function parseGscCsv(csvPath) {
  const absPath = path.resolve(csvPath);
  if (!fs.existsSync(absPath)) {
    return { error: `File not found: ${csvPath}` };
  }

  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    return { error: 'CSV file is empty or has no data rows' };
  }

  // Parse header to detect format (Queries vs Pages export)
  const header = lines[0].toLowerCase();
  const isQueries = header.includes('query') || header.includes('top queries');
  const isPages = header.includes('page') || header.includes('url');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle CSV quoting
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 4) continue;

    rows.push({
      item: parts[0],       // query string or URL
      clicks: parseInt(parts[1]) || 0,
      impressions: parseInt(parts[2]) || 0,
      ctr: parseFloat(parts[3]) || 0,
      position: parseFloat(parts[4]) || 0,
    });
  }

  return {
    type: isQueries ? 'queries' : isPages ? 'pages' : 'unknown',
    rowCount: rows.length,
    rows,
    insights: generateInsights(rows, isQueries),
  };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function generateInsights(rows, isQueries) {
  const insights = [];

  // Quick wins: high impressions but position 4-20 (almost ranking)
  const quickWins = rows.filter(r => r.impressions > 10 && r.position >= 4 && r.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  if (quickWins.length > 0) {
    insights.push({
      type: 'quick-wins',
      title: 'Quick Wins — Almost Ranking',
      description: `${quickWins.length} ${isQueries ? 'queries' : 'pages'} with high impressions but position 4-20. Small improvements could move these to page 1.`,
      items: quickWins.map(r => ({
        item: r.item,
        impressions: r.impressions,
        position: Math.round(r.position * 10) / 10,
        clicks: r.clicks,
      })),
    });
  }

  // Low CTR despite good position (position 1-3 but CTR < 3%)
  const lowCtr = rows.filter(r => r.position <= 3 && r.ctr < 3 && r.impressions > 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  if (lowCtr.length > 0) {
    insights.push({
      type: 'low-ctr',
      title: 'Low CTR Despite Good Position',
      description: `${lowCtr.length} ${isQueries ? 'queries' : 'pages'} ranking in top 3 but with CTR below 3%. Improve title tags and meta descriptions.`,
      items: lowCtr.map(r => ({
        item: r.item,
        position: Math.round(r.position * 10) / 10,
        ctr: r.ctr + '%',
        impressions: r.impressions,
      })),
    });
  }

  // Declining: high impressions, very low clicks (engagement problem)
  const declining = rows.filter(r => r.impressions > 100 && r.clicks < 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  if (declining.length > 0) {
    insights.push({
      type: 'low-engagement',
      title: 'High Impressions, Low Clicks',
      description: `${declining.length} ${isQueries ? 'queries' : 'pages'} getting impressions but almost no clicks. Content or SERP snippet needs improvement.`,
      items: declining.map(r => ({
        item: r.item,
        impressions: r.impressions,
        clicks: r.clicks,
        position: Math.round(r.position * 10) / 10,
      })),
    });
  }

  // Summary stats
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const avgPosition = rows.length > 0 ? rows.reduce((s, r) => s + r.position, 0) / rows.length : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return {
    summary: {
      totalClicks,
      totalImpressions,
      avgPosition: Math.round(avgPosition * 10) / 10,
      avgCtr: Math.round(avgCtr * 100) / 100 + '%',
    },
    insights,
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length > 0) {
  const result = parseGscCsv(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
