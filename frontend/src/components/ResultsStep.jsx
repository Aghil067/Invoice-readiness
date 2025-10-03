// in src/components/ResultsStep.jsx
import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ### 1. CORRECTED IMPORT ###

const ScoreBar = ({ label, score }) => (
  <div className="score-bar-container">
    <span className="score-label">{label}</span>
    <div className="score-bar-background">
      <div className="score-bar-foreground" style={{ width: `${score}%` }}>
        {score}
      </div>
    </div>
  </div>
);

function ResultsStep({ report, onStartOver }) {
  const { scores, coverage, ruleFindings, reportId } = report;

  const ruleTips = {
    TOTALS_BALANCE: "Tip: The sum of total_excl_vat and vat_amount should equal total_incl_vat.",
    LINE_MATH: "Tip: Check your line item calculations. The line_total should equal qty * unit_price.",
    DATE_ISO: "Tip: Dates must be in the YYYY-MM-DD format (e.g., 2025-01-31).",
    CURRENCY_ALLOWED: "Tip: The currency must be one of AED, SAR, MYR, or USD.",
    TRN_PRESENT: "Tip: Both buyer.trn and seller.trn must be present and not empty.",
  };

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    
    doc.text("E-Invoicing Readiness Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Report ID: ${reportId}`, 14, 28);
    doc.text(`Overall Readiness Score: ${scores.overall}`, 14, 36);

    // ### 2. CORRECTED FUNCTION CALLS ###
    autoTable(doc, {
      startY: 45,
      head: [['Category', 'Score']],
      body: Object.entries(scores).map(([key, value]) => [key.charAt(0).toUpperCase() + key.slice(1), value]),
    });

    autoTable(doc, {
      head: [['Status', 'Field', 'Candidate (if applicable)']],
      body: [
        ...coverage.matched.map(f => ['Matched', f, 'N/A']),
        ...coverage.close.map(c => ['Close', c.target, c.candidate]),
        ...coverage.missing.map(f => ['Missing', f, 'N/A']),
      ],
    });
    
    autoTable(doc, {
      head: [['Rule', 'Status', 'Note']],
      body: ruleFindings.map(r => [r.rule, r.ok ? '✅ Pass' : '❌ Fail', !r.ok ? ruleTips[r.rule] : '']),
    });

    doc.save(`report-${reportId}.pdf`);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/report/${reportId}`;
    navigator.clipboard.writeText(link);
    alert('Shareable link copied to clipboard!');
  };

  return (
    <div>
      <div className="scores-container">
        <h3>Overall Readiness: {scores.overall}</h3>
        <ScoreBar label="Data" score={scores.data} />
        <ScoreBar label="Coverage" score={scores.coverage} />
        <ScoreBar label="Rules" score={scores.rules} />
        <ScoreBar label="Posture" score={scores.posture} />
      </div>

      <div className="results-grid">
        <div className="coverage-panel">
          <h4>Field Coverage</h4>
          <h5>✅ Matched</h5>
          <ul>{coverage.matched.map(f => <li key={f}>{f}</li>)}</ul>
          <h5>🤔 Close</h5>
          <ul>{coverage.close.map(c => <li key={c.target}>{c.candidate} ➡️ {c.target}</li>)}</ul>
          <h5>❌ Missing</h5>
          <ul>{coverage.missing.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
        <div className="rules-panel">
          <h4>Rule Findings</h4>
          <ul>
            {ruleFindings.map(r => (
              <li key={r.rule} className={!r.ok ? 'rule-failed' : ''}>
                {r.ok ? '✅' : '❌'} <strong>{r.rule}</strong>
                {!r.ok && <p className="rule-tip">{ruleTips[r.rule]}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="actions-panel">
          <button onClick={downloadReport}>Download Report JSON</button>
          <button onClick={exportToPdf}>Export to PDF</button>
          <button onClick={copyLink}>Copy Shareable Link</button>
          <button onClick={onStartOver}>Analyze Another File</button>
      </div>
    </div>
  );
}

export default ResultsStep;