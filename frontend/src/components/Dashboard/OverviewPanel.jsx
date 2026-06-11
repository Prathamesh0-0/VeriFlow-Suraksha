import React from 'react';
import { motion } from 'framer-motion';
import RiskGauge from './RiskGauge';
import TaxRecalculation from '../Coherence/TaxRecalculation';

export default function OverviewPanel() {
  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">System Integrity</span>
          <h4 className="text-2xl font-bold text-[#0F172A] mt-2">98.4%</h4>
          <p className="text-xs text-emerald-600 mt-1">▲ Stable Operational State</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Active Anomalies</span>
          <h4 className="text-2xl font-bold text-[#0F172A] mt-2">3 Flagged</h4>
          <p className="text-xs text-amber-600 mt-1">● Pending Forensic Review</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Processing Velocity</span>
          <h4 className="text-2xl font-bold text-[#0F172A] mt-2">1,240 l/s</h4>
          <p className="text-xs text-slate-400 mt-1">Within standard thresholds</p>
        </div>
      </div>

      {/* Main Workspace Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Metrics */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Risk Distribution Node</h3>
          <div className="flex justify-center items-center h-[260px]">
            <RiskGauge />
          </div>
        </div>

        {/* Real-time Tax Drift Calculations */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Live Recalculation Engine</h3>
          <div className="overflow-x-auto">
            <TaxRecalculation />
          </div>
        </div>
      </div>
    </div>
  );
}
