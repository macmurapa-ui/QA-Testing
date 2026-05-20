import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, PlayCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';

function StatCard({ label, value, colour }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <div className={`text-2xl font-bold ${colour}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function fmt(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function Tests() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState({});  // test_id -> run_id
  const [collapsed, setCollapsed] = useState({});
  const [filter, setFilter]     = useState('all');
  const navigate = useNavigate();

  const fetchTests = useCallback(async () => {
    const res  = await fetch('/api/tests');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  // Poll for running tests
  useEffect(() => {
    const ids = Object.keys(running);
    if (!ids.length) return;
    const interval = setInterval(async () => {
      let anyStillRunning = false;
      for (const [test_id, run_id] of Object.entries(running)) {
        const res  = await fetch(`/api/runs/${run_id}`);
        const run  = await res.json();
        if (run.status !== 'running') {
          setRunning(prev => { const n = { ...prev }; delete n[test_id]; return n; });
          fetchTests();
        } else {
          anyStillRunning = true;
        }
      }
      if (!anyStillRunning) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [running, fetchTests]);

  async function runTest(test_id) {
    const res    = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_id }) });
    const { run_id } = await res.json();
    setRunning(prev => ({ ...prev, [test_id]: run_id }));
  }

  async function runAll() {
    if (!data) return;
    const ids = data.areas.filter(a => a.status === 'AUTOMATED' && a.script_path).map(a => a.id);
    const res = await fetch('/api/runs/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_ids: ids }) });
    const { runs } = await res.json();
    const newRunning = {};
    for (const { test_id, run_id } of runs) newRunning[test_id] = run_id;
    setRunning(prev => ({ ...prev, ...newRunning }));
  }

  function toggleArea(area) {
    setCollapsed(prev => ({ ...prev, [area]: !prev[area] }));
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading tests…</div>;

  const { grouped, meta } = data;
  const pct = meta.total ? Math.round(meta.automated / meta.total * 100) : 0;

  const areaOrder = ['Admin Portal', 'Admin Reporting', 'Agent Dashboard', 'Partner API', 'Billing Preferences'];
  const areas = areaOrder.filter(a => grouped[a]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Test Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">All functional test areas across the HTM platform</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All statuses</option>
            <option value="AUTOMATED">Automated only</option>
            <option value="PENDING">Pending only</option>
            <option value="BLOCKED">Blocked only</option>
          </select>
          <button
            onClick={runAll}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <PlayCircle size={15} />
            Run All Automated
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Areas"  value={meta.total}     colour="text-gray-800" />
        <StatCard label="Automated"    value={meta.automated} colour="text-green-600" />
        <StatCard label="Coverage"     value={`${pct}%`}      colour="text-indigo-600" />
        <StatCard label="Runs Today"   value={meta.total_runs || 0} colour="text-blue-600" />
      </div>

      {/* Test areas */}
      {areas.map(areaName => {
        const subs   = grouped[areaName];
        const allTests = Object.values(subs).flat();
        const visible  = filter === 'all' ? allTests : allTests.filter(t => t.status === filter);
        if (!visible.length) return null;

        const isOpen = !collapsed[areaName];

        return (
          <div key={areaName} className="mb-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Area header */}
            <button
              onClick={() => toggleArea(areaName)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a2e] text-white hover:bg-[#16213e] transition-colors"
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <span className="font-semibold text-sm">{areaName}</span>
                <span className="text-xs text-indigo-300 ml-1">
                  {visible.filter(t => t.status === 'AUTOMATED').length} automated / {visible.length} total
                </span>
              </div>
            </button>

            {isOpen && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-12">#</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Test Name</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-28">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-36">Script</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-20">Last Result</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-32">Last Run</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-20">Duration</th>
                    <th className="px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(subs).map(([subName, tests]) => {
                    const subTests = filter === 'all' ? tests : tests.filter(t => t.status === filter);
                    if (!subTests.length) return null;
                    return (
                      <React.Fragment key={subName}>
                        {subName && (
                          <tr>
                            <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50/70 border-b border-gray-100 uppercase tracking-wide">
                              {subName}
                            </td>
                          </tr>
                        )}
                        {subTests.map((t, i) => {
                          const isRunning = running[t.id] !== undefined;
                          const last      = t.last_run;
                          return (
                            <tr key={t.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                              <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{t.id}</td>
                              <td className="px-4 py-2.5 text-gray-800 font-medium">{t.name}</td>
                              <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                              <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{t.script || '—'}</td>
                              <td className="px-4 py-2.5">
                                {isRunning ? <StatusBadge status="running" /> : last ? (
                                  <button
                                    onClick={() => navigate(`/runs/${last.id}`)}
                                    className="hover:underline"
                                  >
                                    <StatusBadge status={last.status} />
                                  </button>
                                ) : <span className="text-xs text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-400">{last ? fmtDate(last.completed_at) : '—'}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-400">{last ? fmt(last.duration_ms) : '—'}</td>
                              <td className="px-4 py-2.5 text-right">
                                {t.status === 'AUTOMATED' && t.script_path && (
                                  <button
                                    onClick={() => runTest(t.id)}
                                    disabled={isRunning}
                                    title="Run test"
                                    className={`p-1 rounded transition-colors ${isRunning ? 'text-gray-300 cursor-wait' : 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50'}`}
                                  >
                                    {isRunning ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
