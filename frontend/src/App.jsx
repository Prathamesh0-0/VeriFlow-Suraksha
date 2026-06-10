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
        <div className="flex h-screen overflow-hidden bg-surface-900">
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 overflow-y-auto p-6">
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
