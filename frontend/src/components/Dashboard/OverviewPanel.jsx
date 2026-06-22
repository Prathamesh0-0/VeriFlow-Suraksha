import React from 'react';

function getRiskClass(score) {
  if (score >= 60) return 'tampered';
  if (score >= 25) return 'suspicious';
  return 'clean';
}

function ScoreBar({ score }) {
  const cls = getRiskClass(score);
  return (
    <div className="risk-bar-track">
      <div
        className={`risk-bar-fill ${cls}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function ComponentScore({ label, score, weight }) {
  const cls = getRiskClass(score);
  const color = cls === 'tampered' ? 'var(--risk-danger)' : cls === 'suspicious' ? 'var(--risk-warn)' : 'var(--risk-clean)';
  const fillCls = score >= 60 ? 'high' : score >= 25 ? 'mid' : 'low';
  return (
    <div className="score-item">
      <div className="score-item-label">{label}</div>
      <div className="score-item-bar">
        <div className={`score-item-fill ${fillCls}`} style={{ width: `${score}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="score-item-num" style={{ color }}>{score}/100</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>w={weight}</span>
      </div>
    </div>
  );
}

export default function OverviewPanel({ report }) {
  const score = report.overall_risk_score;
  const verdict = report.overall_verdict;
  const cls = getRiskClass(score);
  const flags = report.flags_count || {};

  const verdictEmoji = { clean: '✅', suspicious: '⚠️', tampered: '🚨' }[verdict] || '❓';
  const verdictLabel = { clean: 'VERIFIED CLEAN', suspicious: 'SUSPICIOUS — REVIEW REQUIRED', tampered: 'TAMPERED — REJECT' }[verdict] || verdict.toUpperCase();

  // Gather component scores from the report
  const components = [];
  // Syntax/Structural
  const syntaxScores = report.document_reports
    ?.map(dr => dr.syntax_geometry?.risk_score)
    .filter(s => s != null);
  if (syntaxScores?.length) {
    components.push({
      label: 'Structural DNA',
      score: Math.round(Math.max(...syntaxScores)),
      weight: '0.20',
    });
  }

  // Chronological
  const chronoScores = report.document_reports
    ?.map(dr => dr.chronological?.risk_score)
    .filter(s => s != null);
  if (chronoScores?.length) {
    components.push({
      label: 'Metadata Forensics',
      score: Math.round(Math.max(...chronoScores)),
      weight: '0.15',
    });
  }

  // ELA
  const elaScores = report.document_reports
    ?.flatMap(dr => dr.ela_results?.map(e => e.overall_score) || [])
    .filter(s => s != null);
  if (elaScores?.length) {
    components.push({
      label: 'Error Level Analysis',
      score: Math.round(Math.max(...elaScores)),
      weight: '0.10',
    });
  }

  // Coherence
  if (report.coherence?.risk_score != null) {
    components.push({
      label: 'Cross-Doc Coherence',
      score: Math.round(report.coherence.risk_score),
      weight: '0.35',
    });
  }

  // Tax Logic
  if (report.tax_validation?.risk_score != null) {
    components.push({
      label: 'Tax Logic Engine',
      score: Math.round(report.tax_validation.risk_score),
      weight: '0.20',
    });
  }

  return (
    <div className="panel">
      <div className="panel-title">⚡ Forensic Overview</div>

      {/* Verdict Banner */}
      <div className={`verdict-banner ${cls}`} style={{ marginBottom: 20 }}>
        <div className="verdict-icon">{verdictEmoji}</div>
        <div className="verdict-content">
          <div className="verdict-label">{verdictLabel}</div>
          <div className="verdict-summary">{report.summary}</div>
        </div>
      </div>

      {/* Risk Score */}
      <div style={{ marginBottom: 20 }}>
        <div className="panel-title" style={{ marginBottom: 10 }}>Overall Risk Score</div>
        <div className="risk-gauge-container">
          <div className={`risk-score-big ${cls}`}>{score}</div>
          <div className="risk-bar-wrapper">
            <ScoreBar score={score} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
              <span>CLEAN (0)</span>
              <span>SUSPICIOUS (25)</span>
              <span>TAMPERED (60)</span>
              <span>MAX (100)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flag Counts */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card critical">
          <div className="stat-value">{flags.critical || 0}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card high">
          <div className="stat-value">{flags.high || 0}</div>
          <div className="stat-label">High</div>
        </div>
        <div className="stat-card medium">
          <div className="stat-value">{flags.medium || 0}</div>
          <div className="stat-label">Medium</div>
        </div>
        <div className="stat-card low">
          <div className="stat-value">{flags.low || 0}</div>
          <div className="stat-label">Low</div>
        </div>
        <div className="stat-card neutral">
          <div className="stat-value">{report.total_documents}</div>
          <div className="stat-label">Documents</div>
        </div>
        <div className="stat-card neutral">
          <div className="stat-value">{report.processing_time_seconds}s</div>
          <div className="stat-label">Scan Time</div>
        </div>
      </div>

      {/* Component Score Breakdown */}
      {components.length > 0 && (
        <>
          <div className="panel-title" style={{ marginBottom: 10 }}>Score Breakdown by Layer</div>
          <div className="score-breakdown">
            {components.map(c => (
              <ComponentScore key={c.label} {...c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
