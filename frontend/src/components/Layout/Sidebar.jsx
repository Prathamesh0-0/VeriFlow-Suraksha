import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, FileUp, BarChart3, ShieldAlert, ChevronLeft, ChevronRight, User } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'coherence', label: 'Coherence Matrix', icon: BarChart3 },
    { id: 'forensics', label: 'Forensic System', icon: ShieldAlert },
  ];

  return (
    <motion.aside
      animate={{ width: isOpen ? 260 : 80 }}
      className="bg-[#0F172A] text-slate-200 flex flex-col justify-between border-r border-slate-800 min-h-screen relative z-10"
    >
      <div>
        {/* Branding Area */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800 h-16">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-base tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap"
              >
                VERIFLOW-SURAKSHA
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400"
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 relative ${
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
                {isOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 text-sm">
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 flex items-center gap-3 h-16">
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
          <User size={18} />
        </div>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Analyst Workspace</span>
            <span className="text-[10px] text-slate-500">Secured Node</span>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
