import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';

function fmt(ms) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function Runs() {
  const [runs, setRuns]       = useState([]);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/runs?limit=100')
      .then(r => r.json())
      .then(d => { setRuns(d.runs); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? runs : runs.filter(r => r.status === filter);

  const passes   = runs.filter(r => r.status === 'pass').length;
  const failures = runs.filter(r => r.status === 'fail').length;
  const total    = runs.filter(r => r.status !== 'running').length;
  const passRate = total ? Math.round(passes / total * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Run History</h1>
          <p className="text-sm text-gray-500 mt-0.5">All test executions across the HTM platform</p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All results</option>
          <option value="pass">Pass only</option>
          <option value="fail">Fail only</option>
          <option value="running">Running</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Runs',  value: runs.length,  colour: 'text-gray-800' },
          { label: 'Passed',      value: passes,        colour: 'text-green-600' },
          { label: 'Failed',      value: failures,      colour: 'text-red-600' },
          { label: 'Pass Rate',   value: `${passRate}%`,colour: 'text-indigo-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <div className={`text-2xl font-bold ${c.colour}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {loading && <div className="text-gray-400 py-12 text-center">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-gray-400 py-16 text-center bg-white rounded-lg border border-gray-200">
          No runs found. Click the <strong>Run</strong> button on a test to get started.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-16">Run #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-16">Area</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Test Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Result</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-44">Completed</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run, i) => (
                <tr
                  key={run.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  onClick={() => navigate(`/runs/${run.id}`)}
                >
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-400">#{run.id}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{run.test_id}</td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium">{run.test_name}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={run.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmt(run.duration_ms)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{fmtDate(run.completed_at)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-indigo-500 font-medium">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
