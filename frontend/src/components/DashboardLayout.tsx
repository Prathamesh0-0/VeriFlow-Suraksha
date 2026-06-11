import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileUp, 
  BarChart3, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  User 
} from 'lucide-react';

interface DashboardLayoutProps {
  uploadZoneComponent: React.ReactNode;
  metricsComponent: React.ReactNode;
  visualizationComponent: React.ReactNode;
  forensicTableComponent: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  uploadZoneComponent,
  metricsComponent,
  visualizationComponent,
  forensicTableComponent
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ingestion', label: 'File Ingestion', icon: FileUp },
    { id: 'analytics', label: 'Analytics Workspace', icon: BarChart3 },
    { id: 'forensics', label: 'Forensic System', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1E293B] font-sans flex">
      <motion.aside
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-[#0F172A] text-slate-200 flex flex-col justify-between border-r border-slate-800 relative z-10"
      >
        <div>
          <div className="p-5 flex items-center justify-between border-b border-slate-800 h-16">
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-bold text-lg tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"
                >
                  VERIFLOW-SURAKSHA
                </motion.span>
              )}
            </AnimatePresence>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
            >
              {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          <nav className="p-4 space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 relative group ${
                    isActive ? 'text-white font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBg"
                      className="absolute inset-0 bg-blue-600/20 border-l-4 border-blue-500 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={20} className={`relative z-10 mr-3 ${isActive ? 'text-blue-400' : ''}`} />
                  {isSidebarOpen && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 text-sm">
                      {item.label}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center gap-3 h-16">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
            <User size={18} />
          </div>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Analyst Workspace</span>
              <span className="text-[10px] text-slate-500">Secured Node</span>
            </motion.div>
          )}
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-x-hidden">
        <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between sticky top-0 z-50">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] capitalize">{activeTab} Overview</h1>
            <p className="text-xs text-slate-400">System Monitoring & Forensic Intelligence Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              Live Ingestion Feed
            </span>
          </div>
        </header>

        <main className="p-8 flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <>
              <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {metricsComponent}
              </motion.section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div 
                  className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs"
                  initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Ingestion Engine</h3>
                  {uploadZoneComponent}
                </motion.div>

                <motion.div 
                  className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs"
                  initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Forensic Graph Analytics</h3>
                  <div className="w-full h-[300px] flex items-center justify-center">{visualizationComponent}</div>
                </motion.div>
              </div>

              <motion.section 
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Real-Time Forensic Assessment Ledger</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Flagged transactions, behavioral anomalies, and tax recalculation drift logs.</p>
                  </div>
                </div>
                <div className="p-6 overflow-x-auto">{forensicTableComponent}</div>
              </motion.section>
            </>
          )}

          {activeTab === 'ingestion' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-2xl mx-auto">
              <h2 className="text-lg font-bold mb-2">Dedicated Upload Center</h2>
              <p className="text-xs text-slate-400 mb-6">Drop your systematic log files or transaction batch ledgers here to start processing.</p>
              {uploadZoneComponent}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Expanded Analytic Trends</h2>
              <div className="h-[500px] w-full">{visualizationComponent}</div>
            </div>
          )}

          {activeTab === 'forensics' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold">Comprehensive Forensic Workspace</h2>
              </div>
              <div className="p-6">{forensicTableComponent}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
