import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Upload, FileSearch, BarChart3, Settings, ChevronLeft, Dna } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Upload & Analyze', icon: Upload },
  { path: '/report', label: 'Forensic Report', icon: FileSearch },
];

export default function Sidebar({ open, onToggle }) {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 260 : 72 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-surface-800 border-r border-surface-700/50 z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-700/50">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-emerald">
          <Dna size={22} className="text-white" />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-lg font-bold bg-gradient-to-r from-accent-cyan to-accent-emerald bg-clip-text text-transparent">
                VeriFlow
              </h1>
              <p className="text-[10px] text-text-muted font-mono tracking-wider">FORENSIC ENGINE</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/50'
                }`}
            >
              <Icon size={20} className={isActive ? 'text-accent-cyan' : ''} />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-[3px] h-8 bg-accent-cyan rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-surface-700/50 text-text-muted hover:text-text-primary transition-colors"
      >
        <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronLeft size={18} />
        </motion.div>
      </button>
    </motion.aside>
  );
}
