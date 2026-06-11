import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import OverviewPanel from './components/Dashboard/OverviewPanel';
import CoherenceMatrix from './components/Coherence/CoherenceMatrix';
import ELAViewer from './components/Forensics/ELAViewer';
import StructuralDNA from './components/Forensics/StructuralDNA';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1E293B] font-sans flex">
      {/* Redesigned Premium Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content Stream Container */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        <Header activeTab={activeTab} />

        <main className="p-8 flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {activeTab === 'dashboard' && <OverviewPanel />}
          
          {activeTab === 'coherence' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-[#0F172A] mb-4">System Coherence Mapping Matrix</h2>
              <CoherenceMatrix />
            </div>
          )}

          {activeTab === 'forensics' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-base font-bold text-[#0F172A] mb-4">Error Level Analysis (ELA)</h2>
                <ELAViewer />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-base font-bold text-[#0F172A] mb-4">Structural Schema DNA</h2>
                <StructuralDNA />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
