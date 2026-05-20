const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { spawn } = require('child_process');
const db = require('./db');

const app      = express();
const REPO     = path.resolve(__dirname, '..');
const IS_DEV   = process.env.NODE_ENV !== 'production';
const PORT     = IS_DEV ? 3001 : 3000;

app.use(express.json());

// ── Script discovery ──────────────────────────────────────────────────────────

function scanJsFiles(dir, map = {}) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return map; }
  for (const e of entries) {
    if (['node_modules', 'dashboard', '.git'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) scanJsFiles(full, map);
    else if (e.name.endsWith('.js') && !e.name.endsWith('.config.js')) map[e.name] = full;
  }
  return map;
}

function loadTests() {
  const raw   = fs.readFileSync(path.join(REPO, 'coverage_areas.json'), 'utf8');
  const areas = JSON.parse(raw);
  const scripts = scanJsFiles(REPO);

  // Enrich with @covers tags from JS files
  for (const [basename, fullpath] of Object.entries(scripts)) {
    try {
      const content = fs.readFileSync(fullpath, 'utf8');
      const match   = content.match(/\/\/\s*@covers\s+([\d.,\s]+)/);
      if (!match) continue;
      const ids = match[1].split(/[,\s]+/).filter(s => /^\d+\.\d+$/.test(s.trim())).map(s => s.trim());
      for (const id of ids) {
        const area = areas.find(a => a.id === id);
        if (area && !area.script) area.script = basename;
      }
    } catch { /* skip unreadable files */ }
  }

  // Attach full paths
  for (const area of areas) {
    area.script_path = area.script ? (scripts[area.script] || null) : null;
  }

  return areas;
}

// ── Helper: run a single test ─────────────────────────────────────────────────

function executeTest(area) {
  const run_id = db.createRun(area.id, area.script, area.name);
  const cwd    = path.dirname(area.script_path);

  const proc = spawn('node', [area.script_path], {
    cwd,
    env: { ...process.env }
  });

  let output = '';
  proc.stdout.on('data', d => { output += d.toString(); });
  proc.stderr.on('data', d => { output += d.toString(); });

  proc.on('close', code => {
    const status = code === 0 ? 'pass' : 'fail';
    let failure_summary = null;
    if (status === 'fail') {
      const lines = output.split('\n').filter(l => l.trim());
      const errLines = lines.filter(l => /error|fail|exception|throw/i.test(l));
      failure_summary = (errLines.length ? errLines : lines.slice(-10)).join('\n');
    }
    db.completeRun(run_id, status, output, failure_summary);
  });

  return run_id;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/tests', (req, res) => {
  const areas    = loadTests();
  const lastRuns = db.getLastRunPerTest();
  const lastMap  = Object.fromEntries(lastRuns.map(r => [r.test_id, r]));

  const enriched = areas.map(a => ({ ...a, last_run: lastMap[a.id] || null }));

  // Group: area -> sub_area -> tests[]
  const grouped = {};
  for (const t of enriched) {
    if (!grouped[t.area]) grouped[t.area] = {};
    const sub = t.sub_area || '';
    if (!grouped[t.area][sub]) grouped[t.area][sub] = [];
    grouped[t.area][sub].push(t);
  }

  const automated = areas.filter(a => a.status === 'AUTOMATED').length;
  const stats     = db.getStats();

  res.json({ grouped, areas: enriched, meta: { total: areas.length, automated, ...stats } });
});

app.post('/api/runs', (req, res) => {
  const { test_id } = req.body;
  const areas = loadTests();
  const area  = areas.find(a => a.id === test_id);
  if (!area)             return res.status(404).json({ error: 'Test not found' });
  if (!area.script_path) return res.status(400).json({ error: 'No script found for this test' });
  res.json({ run_id: executeTest(area) });
});

app.post('/api/runs/bulk', (req, res) => {
  const { test_ids } = req.body;
  const areas  = loadTests();
  const result = [];
  for (const test_id of test_ids) {
    const area = areas.find(a => a.id === test_id);
    if (!area?.script_path) continue;
    result.push({ test_id, run_id: executeTest(area) });
  }
  res.json({ runs: result });
});

app.get('/api/runs', (req, res) => {
  const limit   = Math.min(parseInt(req.query.limit)  || 50, 200);
  const offset  = parseInt(req.query.offset) || 0;
  const test_id = req.query.test_id || null;
  res.json({ runs: db.getRuns(limit, offset, test_id) });
});

app.get('/api/runs/:id', (req, res) => {
  const run = db.getRun(parseInt(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// ── Static (production) ───────────────────────────────────────────────────────

if (!IS_DEV) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => console.log(`QA Dashboard API → http://localhost:${PORT}`));
