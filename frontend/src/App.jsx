import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnalysisProvider } from './context/AnalysisContext.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';
import Header from './components/Layout/Header.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ReportPage from './pages/ReportPage.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AnalysisProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f3f4f6' }}>
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <Routes>
                <Route path="/" element={<UploadPage />} />
                <Route path="/report" element={<ReportPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AnalysisProvider>
  );
}
