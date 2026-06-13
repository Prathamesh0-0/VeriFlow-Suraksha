import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Upload Documents' },
  { path: '/report', label: 'Analysis Report' },
];

export default function Sidebar({ open, onToggle }) {
  const location = useLocation();

  return (
    <aside
      style={{
        width: open ? 220 : 56,
        minWidth: open ? 220 : 56,
        height: '100vh',
        background: '#fff',
        borderRight: '1px solid #d1d5db',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #d1d5db',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 56,
      }}>
        <div style={{
          width: 28, height: 28,
          background: '#0056b3', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>V</div>
        {open && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>VeriFlow</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Document Verification</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#0056b3' : '#4b5563',
                background: isActive ? '#eff6ff' : 'transparent',
                borderLeft: isActive ? '3px solid #0056b3' : '3px solid transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {open ? item.label : item.label.charAt(0)}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          padding: '10px',
          borderTop: '1px solid #d1d5db',
          background: 'none',
          border: 'none',
          borderTop: '1px solid #d1d5db',
          cursor: 'pointer',
          color: '#9ca3af',
          fontSize: 16,
          textAlign: 'center',
        }}
      >
        {open ? '\u25C0' : '\u25B6'}
      </button>
    </aside>
  );
}
