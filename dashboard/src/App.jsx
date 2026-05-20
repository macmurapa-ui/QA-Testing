import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlayCircle, History, ChevronRight } from 'lucide-react';
import Tests from './pages/Tests.jsx';
import Runs from './pages/Runs.jsx';
import RunDetail from './pages/RunDetail.jsx';

const NAV = [
  { to: '/',      label: 'Tests',       icon: LayoutDashboard },
  { to: '/runs',  label: 'Run History', icon: History },
];

function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-[#1a1a2e] text-white flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-1">Help The Move</div>
        <div className="text-lg font-bold">QA Dashboard</div>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors
               ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-white/10 text-xs text-gray-500">
        HTM Clone · clone.helpthemove.co.uk
      </div>
    </aside>
  );
}

function Breadcrumb() {
  const loc = useLocation();
  const parts = loc.pathname.split('/').filter(Boolean);
  const labels = { runs: 'Run History' };
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <span className="text-gray-400">HTM QA</span>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} />
          <span className="text-gray-700 font-medium capitalize">{labels[p] || p}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 min-h-screen">
          <Breadcrumb />
          <Routes>
            <Route path="/"         element={<Tests />} />
            <Route path="/runs"     element={<Runs />} />
            <Route path="/runs/:id" element={<RunDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
