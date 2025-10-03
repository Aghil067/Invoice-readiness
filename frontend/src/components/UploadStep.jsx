// in src/components/UploadStep.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';

// Helper function to guess the data type for the badge
const getType = (value) => {
  if (!isNaN(Date.parse(value)) && isNaN(value)) return 'date';
  if (!isNaN(parseFloat(value)) && isFinite(value)) return 'number';
  return 'text';
};

function UploadStep({ onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // New state for preview data
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');

    // New logic to parse and show a preview
    Papa.parse(selectedFile, {
      header: true,
      preview: 20, // Only parse the first 20 rows for the preview
      dynamicTyping: true,
      complete: (result) => {
        setPreview({
          headers: result.meta.fields,
          data: result.data,
        });
      },
    });
  };

  const handleAnalyze = async () => {
    // ... (this function remains unchanged)
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadResponse = await fetch('http://localhost:3001/upload', { method: 'POST', body: formData });
      if (!uploadResponse.ok) throw new Error('File upload failed.');
      const { uploadId } = await uploadResponse.json();
      const questionnaire = { webhooks: true, sandbox_env: true, retries: false };
      const analyzeResponse = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, questionnaire }),
      });
      if (!analyzeResponse.ok) throw new Error('Analysis failed.');
      const report = await analyzeResponse.json();
      onAnalysisComplete(report);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="upload-controls">
        <input type="file" onChange={handleFileChange} accept=".csv,.json" />
        <button onClick={handleAnalyze} disabled={isLoading || !file}>
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* New JSX for rendering the preview table */}
      {preview && (
        <div className="preview-container">
          <h4>Data Preview (First 20 Rows)</h4>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {preview.headers.map(header => (
                    <th key={header}>
                      {header} <span className={`badge type-${getType(preview.data[0]?.[header])}`}>{getType(preview.data[0]?.[header])}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {preview.headers.map(header => (
                      <td key={header}>{String(row[header])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadStep;