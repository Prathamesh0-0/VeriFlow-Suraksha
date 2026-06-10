import React from 'react';
import { Shield, Menu } from 'lucide-react';

export default function Header({ onToggleSidebar }) {
  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-surface-700/50 bg-surface-800/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-700/50 transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-text-muted">
          <Shield size={14} className="text-accent-emerald" />
          <span className="font-mono text-xs tracking-wider">UNDERWRITING FORENSICS PLATFORM</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20">
          <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-xs font-medium text-accent-emerald">Engine Online</span>
        </div>
        <div className="text-xs font-mono text-text-muted">
          v1.0.0-proto
        </div>
      </div>
    </header>
  );
}
