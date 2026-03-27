import fs from 'fs';
import path from 'path';

const HISTORY_MAX = 100;

function getHistoryPath(dir) {
  return path.join(dir, '.claude-rank', 'reports', 'audit-history.json');
}

function readHistory(dir) {
  const historyPath = getHistoryPath(dir);
  if (!fs.existsSync(historyPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeHistory(dir, data) {
  const historyPath = getHistoryPath(dir);
  const reportsDir = path.dirname(historyPath);
  fs.mkdirSync(reportsDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(historyPath, JSON.stringify(data, null, 2), 'utf8');
}

export function saveScore(dir, category, score) {
  const data = readHistory(dir);
  if (!data[category]) data[category] = [];
  data[category].push({ score, timestamp: new Date().toISOString() });
  if (data[category].length > HISTORY_MAX) {
    data[category] = data[category].slice(-HISTORY_MAX);
  }
  writeHistory(dir, data);
}

export function showHistory(dir, category) {
  const data = readHistory(dir);
  const entries = data[category] || [];
  if (entries.length === 0) {
    return { total_runs: 0, latest: null, best: null, worst: null, trend: 'stable' };
  }
  const scores = entries.map(e => e.score);
  const latest = scores[scores.length - 1];
  const best = Math.max(...scores);
  const worst = Math.min(...scores);
  const first = scores[0];
  let trend;
  if (latest > first) trend = 'improving';
  else if (latest < first) trend = 'declining';
  else trend = 'stable';
  return { total_runs: entries.length, latest, best, worst, trend };
}

export function diffScores(dir, category) {
  const data = readHistory(dir);
  const entries = data[category] || [];
  if (entries.length === 0) {
    return { previous: null, current: null, change: 0 };
  }
  if (entries.length === 1) {
    return { previous: null, current: entries[0].score, change: 0 };
  }
  const current = entries[entries.length - 1].score;
  const previous = entries[entries.length - 2].score;
  return { previous, current, change: current - previous };
}

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , command, dir, categoryOrArg, scoreArg] = process.argv;

  if (!command || !dir) {
    console.error('Usage:');
    console.error('  node tools/audit-history.mjs save <dir> <category> <score>');
    console.error('  node tools/audit-history.mjs show <dir> [category]');
    console.error('  node tools/audit-history.mjs diff <dir> [category]');
    process.exit(1);
  }

  if (command === 'save') {
    const category = categoryOrArg;
    const score = Number(scoreArg);
    if (!category || isNaN(score)) {
      console.error('save requires <category> and <score>');
      process.exit(1);
    }
    saveScore(dir, category, score);
    console.log(`Saved score ${score} for category "${category}"`);
  } else if (command === 'show') {
    const data = readHistory(dir);
    const categories = categoryOrArg ? [categoryOrArg] : Object.keys(data);
    if (categories.length === 0) {
      console.log('No history found.');
    } else {
      for (const cat of categories) {
        const h = showHistory(dir, cat);
        console.log(`[${cat}] runs=${h.total_runs} latest=${h.latest} best=${h.best} worst=${h.worst} trend=${h.trend}`);
      }
    }
  } else if (command === 'diff') {
    const data = readHistory(dir);
    const categories = categoryOrArg ? [categoryOrArg] : Object.keys(data);
    if (categories.length === 0) {
      console.log('No history found.');
    } else {
      for (const cat of categories) {
        const d = diffScores(dir, cat);
        const sign = d.change > 0 ? '+' : '';
        console.log(`[${cat}] previous=${d.previous} current=${d.current} change=${sign}${d.change}`);
      }
    }
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}
