import React from 'react';

const STYLES = {
  AUTOMATED: 'bg-green-100 text-green-800 border border-green-200',
  PENDING:   'bg-gray-100 text-gray-600 border border-gray-200',
  BLOCKED:   'bg-orange-100 text-orange-700 border border-orange-200',
  pass:      'bg-green-100 text-green-800 border border-green-200',
  fail:      'bg-red-100 text-red-700 border border-red-200',
  running:   'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse',
};

const LABELS = {
  AUTOMATED: 'Automated',
  PENDING:   'Pending',
  BLOCKED:   'Blocked',
  pass:      'Pass',
  fail:      'Fail',
  running:   'Running…',
};

export default function StatusBadge({ status, className = '' }) {
  const key = status || 'PENDING';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STYLES[key] || STYLES.PENDING} ${className}`}>
      {LABELS[key] || key}
    </span>
  );
}
