import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';

function fmt(ms) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt + 'Z').toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function RunDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [run, setRun]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval;
    async function poll() {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json();
      setRun(data);
      setLoading(false);
      if (data.status === 'running') {
        interval = setTimeout(poll, 2000);
      }
    }
    poll();
    return () => clearTimeout(interval);
  }, [id]);

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading run…</div>;
  if (!run?.id) return <div className="text-red-500 py-12 text-center">Run not found.</div>;

  const isPending = run.status === 'running';
  const isPass    = run.status === 'pass';
  const isFail    = run.status === 'fail';

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header card */}
      <div className={`rounded-lg border px-6 py-5 mb-5 ${
        isPending ? 'bg-blue-50 border-blue-200' :
        isPass    ? 'bg-green-50 border-green-200' :
                    'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500">Run #{run.id} · {run.test_id}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{run.test_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Clock size={12} /> {fmtDate(run.started_at)}</span>
              {run.duration_ms && <span>Duration: <strong>{fmt(run.duration_ms)}</strong></span>}
              <span className="font-mono">{run.script}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending && <RefreshCw size={18} className="text-blue-500 animate-spin" />}
            {isPass    && <CheckCircle2 size={22} className="text-green-500" />}
            {isFail    && <XCircle size={22} className="text-red-500" />}
            <StatusBadge status={run.status} className="text-sm px-3 py-1" />
          </div>
        </div>
      </div>

      {/* Failure summary */}
      {isFail && run.failure_summary && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 mb-5">
          <h2 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
            <XCircle size={14} /> Failure Summary
          </h2>
          <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap leading-relaxed">
            {run.failure_summary}
          </pre>
        </div>
      )}

      {/* Running notice */}
      {isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 mb-5 text-sm text-blue-700">
          Test is currently running — this page will update automatically.
        </div>
      )}

      {/* Full output */}
      {run.output ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Full Output
          </div>
          <pre className="px-5 py-4 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[60vh]">
            {run.output}
          </pre>
        </div>
      ) : (
        !isPending && (
          <div className="text-gray-400 text-sm py-8 text-center bg-white rounded-lg border border-gray-200">
            No output captured.
          </div>
        )
      )}
    </div>
  );
}
