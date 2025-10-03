// in src/components/RecentReports.jsx
import React, { useState, useEffect } from 'react';

function RecentReports() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('http://localhost:3001/reports?limit=10');
        const data = await response.json();
        setReports(data);
      } catch (error) {
        console.error("Could not fetch recent reports:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (isLoading) return <p>Loading recent reports...</p>;
  if (reports.length === 0) return null; // Don't show if there are no reports

  return (
    <div className="recent-reports">
      <h3>Recent Analyses</h3>
      <table>
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Overall Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => (
            <tr key={report.id}>
              <td>{report.id}</td>
              <td>{report.overallScore}</td>
              <td>{new Date(report.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecentReports;