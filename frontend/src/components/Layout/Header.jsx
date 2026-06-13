import React from 'react';

export default function Header({ onToggleSidebar }) {
  return (
    <header style={{
      height: 48,
      background: '#fff',
      borderBottom: '1px solid #d1d5db',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onToggleSidebar}
          className="no-print"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: '#6b7280', padding: '4px 8px',
          }}
        >
          ☰
        </button>
        <span style={{ fontWeight: 600, color: '#1f2937' }}>
          VeriFlow — Document Verification System
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#6b7280' }}>
        <span>Status: <span style={{ color: '#15803d' }}>Online</span></span>
      </div>
    </header>
  );
}
