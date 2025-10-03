// in src/App.jsx
import React, { useState } from 'react';
import './App.css';
import UploadStep from './components/UploadStep';
import ResultsStep from './components/ResultsStep';
import RecentReports from './components/RecentReports'; // ### NEW IMPORT ###

function App() {
  const [step, setStep] = useState(1);
  const [report, setReport] = useState(null);

  const goToNextStep = () => setStep(step + 1);
  const startOver = () => {
    setStep(1);
    setReport(null);
  };

  const handleAnalysisComplete = (reportData) => {
    setReport(reportData);
    goToNextStep();
  };

  return (
    <div className="container">
      {/* ### UPDATED: Added a header for better styling ### */}
      <header className="app-header">
        <h1>E-Invoicing Readiness Analyzer</h1>
      </header>
      
      {step === 1 && (
        <div className="wizard-step">
          <h2>Welcome</h2>
          <p>This tool analyzes your invoice data against the GETS v0.1 standard.</p>
          <button onClick={goToNextStep}>Get Started</button>
          {/* ### NEW: RecentReports component is rendered here ### */}
          <RecentReports />
        </div>
      )}

      {step === 2 && (
        <div className="wizard-step">
          <h2>Step 2: Upload Your Data</h2>
          <UploadStep onAnalysisComplete={handleAnalysisComplete} />
        </div>
      )}

      {step === 3 && (
        <div className="wizard-step">
          <h2>Step 3: Analysis Results</h2>
          {report ? <ResultsStep report={report} onStartOver={startOver} /> : <p>Loading report...</p>}
        </div>
      )}
    </div>
  );
}

export default App;