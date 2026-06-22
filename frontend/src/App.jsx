import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ReportPage from './pages/ReportPage.jsx';

function AppShell() {
  const { state } = useAnalysis();
  const location = useLocation();
  const onReportPage = location.pathname === '/report';

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="app-logo">
          <div className="logo-icon">⚡</div>
          <div>
            <div>VeriFlow</div>
            <div className="logo-sub">Document Forensics Engine</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onReportPage && state.report && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginRight: 8,
            }}>
              REF: {state.report.packet_id}
            </span>
          )}
          <NavLink
            to="/"
            style={({ isActive }) => ({
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              border: '1px solid',
              borderColor: isActive ? 'var(--border-hover)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            Upload
          </NavLink>
          {state.report && (
            <NavLink
              to="/report"
              style={({ isActive }) => ({
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                fontSize: 12,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-hover)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              Report
            </NavLink>
          )}
          <div className="header-status">
            <div className="status-dot" />
            Engine Online
          </div>
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AnalysisProvider>
  );
}
