import React from 'react';

export default function Header({ activeTab }) {
  return (
    <header className="bg-white border-b border-[#E2E8F0] h-20 px-8 flex items-center justify-between sticky top-0 z-50 flex-shrink-0 font-sans">
      <div className="text-left">
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Welcome back, Underwriter</h1>
        <p className="text-xs text-[#94A3B8] mt-0.5">The dashboard is where you can analyze processing efficacy and stay up-to-date on potential attack surface.</p>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2 rounded-xl">
          <span className="text-[#64748B] font-medium">Testing status:</span>
          <span className="bg-[#DCFCE7] text-[#15803D] font-bold px-2 py-0.5 rounded-md text-[11px]">Active</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-xs">UN</div>
      </div>
    </header>
  );
}
