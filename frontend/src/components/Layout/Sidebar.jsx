import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  // Your exact original navigation items from your first edit
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'coherence', label: 'Coherence Matrix', icon: '📈' },
    { id: 'forensics', label: 'Forensic System', icon: '🛡️' },
  ];

  return (
    <aside className="w-[260px] bg-white text-[#1E293B] flex flex-col justify-between border-r border-[#E2E8F0] min-h-screen p-6 font-sans select-none flex-shrink-0">
      <div>
        {/* THE GEOMETRIC LOGO BUILD */}
        <div className="flex items-center gap-3 mb-10 pl-2">
          <div className="grid grid-cols-2 gap-0.5 w-7 h-7 flex-shrink-0">
            <div className="bg-[#38BDF8] rounded-tl-sm rounded-br-xs"></div>
            <div className="bg-[#94A3B8] rounded-tr-md rounded-bl-xs opacity-40"></div>
            <div className="bg-[#94A3B8] rounded-bl-md rounded-tr-xs opacity-40"></div>
            <div className="bg-[#0284C7] rounded-br-sm rounded-tl-xs"></div>
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="font-bold text-lg text-[#0F172A] tracking-tight">VeriFlow</span>
            <span className="text-[10px] font-bold text-[#0284C7] tracking-widest mt-0.5 uppercase">Suraksha Engine</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="text-left">
          <p className="text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase px-3 mb-2">Navigation</p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive 
                      ? 'bg-[#F1F5F9] text-[#0F172A] font-semibold' 
                      : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                  }`}
                >
                  <span className="mr-3 text-base opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* FOOTER USER profile */}
      <div className="pt-4 border-t border-[#F1F5F9] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">UN</div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-[#0F172A]">Underwriter Node</span>
          <span className="text-[10px] text-[#94A3B8]">Secured Session</span>
        </div>
      </div>
    </aside>
  );
}
