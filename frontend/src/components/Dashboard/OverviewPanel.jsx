import React from 'react';
import RiskGauge from './RiskGauge'; 
import TaxRecalculation from '../Coherence/TaxRecalculation'; 

export default function OverviewPanel() {
  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* 4-COLUMN STATS CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex justify-between text-[#64748B] text-xs font-medium"><span>Open finding</span><span>🔍</span></div>
          <h4 className="text-3xl font-bold text-[#0F172A] mt-2">127</h4>
          <div className="flex justify-between items-center mt-4 text-[10px] font-medium"><span className="text-[#94A3B8]">0% VS 90 days ago</span><span className="text-[#10B981]">16% Up ▲</span></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex justify-between text-[#64748B] text-xs font-medium"><span>Now finding</span><span>📋</span></div>
          <h4 className="text-3xl font-bold text-[#0F172A] mt-2">67</h4>
          <div className="flex justify-between items-center mt-4 text-[10px] font-medium"><span className="text-[#94A3B8]">0% VS 90 days ago</span><span className="text-[#EF4444]">5% Down ▼</span></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex justify-between text-[#64748B] text-xs font-medium"><span>Closed findings</span><span>⏱️</span></div>
          <h4 className="text-3xl font-bold text-[#0F172A] mt-2">235</h4>
          <div className="flex justify-between items-center mt-4 text-[10px] font-medium"><span className="text-[#94A3B8]">5% VS 90 days ago</span><span className="text-[#EF4444]">3% Down ▼</span></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex justify-between text-[#64748B] text-xs font-medium"><span>Avg time to remediate</span><span>🕒</span></div>
          <h4 className="text-3xl font-bold text-[#0284C7] mt-2">87s</h4>
          <div className="flex justify-between items-center mt-4 text-[10px] font-medium"><span className="text-[#94A3B8]">5% VS 90 days ago</span><span className="text-[#10B981]">24% Increase ▲</span></div>
        </div>
      </div>

      {/* LOWER PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Card Panel: Your actual math matrix ledger logic component */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-4">
            <h3 className="text-sm font-bold text-[#0F172A]">Finding Overview & Parallel Core Engines</h3>
            <div className="flex bg-[#F1F5F9] p-0.5 rounded-lg text-[11px] font-medium text-[#64748B]">
              <span className="px-3 py-1 bg-white rounded-md text-[#0F172A] shadow-2xs">All</span>
              <span className="px-3 py-1">Open</span>
              <span className="px-3 py-1">Close</span>
            </div>
          </div>

          {/* Your real logic file runs perfectly intact right here */}
          <TaxRecalculation />

          {/* Severity Range Element */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-[#94A3B8] tracking-wider uppercase">Severity Allocation Range</span>
            <div className="w-full h-8 rounded-lg overflow-hidden flex text-[11px] font-bold text-white text-center items-center">
              <div className="bg-[#0F172A] h-full flex items-center justify-center" style={{ width: '25%' }}>9 Critical</div>
              <div className="bg-[#F97316] h-full flex items-center justify-center" style={{ width: '50%' }}>11 High</div>
              <div className="bg-[#94A3B8] h-full flex items-center justify-center" style={{ width: '25%' }}>6 Medium</div>
            </div>
          </div>
        </div>

        {/* Right Card Panel: Houses your actual logic Dropzone / upload area */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between min-h-[445px]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-[#0F172A]">Attack Surface Ingestion</h3>
              <span className="text-[#64748B] text-xs cursor-pointer">•••</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">Submit application file records here for processing velocity verification:</p>
            
            {/* Your real functional upload block component renders right here */}
            <RiskGauge />
          </div>

          <button className="w-full bg-[#0F172A] text-white rounded-xl py-3 font-semibold text-xs tracking-wide transition-colors flex items-center justify-center gap-1 shadow-xs mt-4">
            Run 90s Forensic Pipeline →
          </button>
        </div>

      </div>
    </div>
  );
}
