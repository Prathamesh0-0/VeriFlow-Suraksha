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
          <img src="/logo.png" alt="VeriFlow Logo" className="logo-icon" />
          <div className="logo-text-wrapper">
            <div className="logo-title">VERIFLOW</div>
            <div className="logo-sub">Document Forensics</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {onReportPage && state.report && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#aaccff',
              marginRight: 12,
            }}>
              REF: {state.report.packet_id}
            </span>
          )}
          <NavLink
            to="/"
            style={({ isActive }) => ({
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 'bold',
              textDecoration: 'none',
              color: isActive ? '#ffffff' : '#aaccff',
              background: isActive ? '#003366' : 'transparent',
              border: '1px solid',
              borderColor: isActive ? '#ffffff' : 'transparent',
            })}
          >
            Upload
          </NavLink>
          {state.report && (
            <NavLink
              to="/report"
              style={({ isActive }) => ({
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 'bold',
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#aaccff',
                background: isActive ? '#003366' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? '#ffffff' : 'transparent',
              })}
            >
              Report
            </NavLink>
          )}
          <div className="header-status">
            <div className="status-dot" />
            ONLINE
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
