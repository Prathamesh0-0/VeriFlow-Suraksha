import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const COLORS = {
  clean: { ring: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'LOW RISK' },
  suspicious: { ring: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'MEDIUM RISK' },
  tampered: { ring: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'HIGH RISK' },
};

export default function RiskGauge({ score, verdict }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = COLORS[verdict] || COLORS.clean;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  // SVG arc calculation
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * 0.75; // 270 degree arc
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="glass-panel p-6 flex flex-col items-center">
      <h3 className="text-xs font-mono text-text-muted tracking-wider mb-4">AGGREGATE RISK SCORE</h3>

      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="rgba(71, 85, 105, 0.2)"
            strokeWidth="12"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <motion.circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color.ring}
            strokeWidth="12"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference * 0.75 }}
            animate={{ strokeDashoffset: circumference * 0.75 - (animatedScore / 100) * circumference * 0.75 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 8px ${color.ring}50)` }}
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-bold font-mono"
            style={{ color: color.ring }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {Math.round(animatedScore)}
          </motion.span>
          <span className="text-xs text-text-muted font-mono mt-1">/ 100</span>
        </div>
      </div>

      {/* Verdict badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider"
        style={{ backgroundColor: color.bg, color: color.ring, border: `1px solid ${color.ring}30` }}
      >
        {color.label}
      </motion.div>
    </div>
  );
}
