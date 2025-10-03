// in index.js
const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const crypto = require('crypto');
const cors = require('cors'); // Make sure cors is required
const { initializeDatabase } = require('./database');
const { analyzeData } = require('./analyzer');
const app = express();
const port = 3001;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let db;

app.use(cors()); // Make sure cors is used
app.use(express.json());

// --- API Endpoints ---
app.post('/upload', upload.single('file'), async (req, res) => {
  // This code is correct and complete.
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  try {
    const fileContent = req.file.buffer.toString('utf8');
    let parsedData;
    if (req.file.originalname.endsWith('.json')) {
      parsedData = JSON.parse(fileContent);
    } else if (req.file.originalname.endsWith('.csv')) {
      const result = Papa.parse(fileContent, { header: true, dynamicTyping: true });
      parsedData = result.data.filter(row => Object.values(row).some(val => val !== null && val !== ''));
    } else {
      return res.status(400).json({ error: "Unsupported file type." });
    }
    const limitedData = parsedData.slice(0, 200);
    const uploadId = `u_${crypto.randomBytes(8).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const dataJson = JSON.stringify(limitedData);
    await db.run(
      'INSERT INTO uploads (id, raw_data_json, created_at) VALUES (?, ?, ?)',
      [uploadId, dataJson, createdAt]
    );
    res.status(200).json({ uploadId: uploadId });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process file." });
  }
});

app.post('/analyze', async (req, res) => {
  // This code is correct and complete.
  const { uploadId, questionnaire } = req.body;
  if (!uploadId || !questionnaire) {
    return res.status(400).json({ error: "uploadId and questionnaire are required." });
  }
  try {
    const upload = await db.get('SELECT raw_data_json FROM uploads WHERE id = ?', [uploadId]);
    if (!upload) {
      return res.status(404).json({ error: "Upload not found." });
    }
    const data = JSON.parse(upload.raw_data_json);
    const report = analyzeData(data, questionnaire);
    const reportId = `r_${crypto.randomBytes(8).toString('hex')}`;
    report.reportId = reportId;
    const createdAt = new Date().toISOString();
    await db.run(
      'INSERT INTO reports (id, upload_id, report_json, created_at) VALUES (?, ?, ?, ?)',
      [reportId, uploadId, JSON.stringify(report), createdAt]
    );
    res.status(200).json(report);
  } catch (error) {
    console.error("Analysis failed:", error);
    res.status(500).json({ error: "Failed to analyze data." });
  }
});

// ### NEW ENDPOINT ADDED HERE ###
app.get('/reports', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const reports = await db.all(
      'SELECT id, report_json, created_at FROM reports ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    // Map to a summary format to avoid sending the full, large report
    const summaries = reports.map(report => {
      const reportData = JSON.parse(report.report_json);
      return {
        id: report.id,
        createdAt: report.created_at,
        overallScore: reportData.scores.overall
      };
    });
    res.status(200).json(summaries);
  } catch (error) {
    console.error("Failed to retrieve reports:", error);
    res.status(500).json({ error: "Failed to retrieve reports." });
  }
});

app.get('/report/:reportId', async (req, res) => {
  // This code is correct and complete.
  const { reportId } = req.params;
  try {
    const report = await db.get('SELECT report_json FROM reports WHERE id = ?', [reportId]);
    if (report) {
      res.status(200).json(JSON.parse(report.report_json));
    } else {
      res.status(404).json({ error: "Report not found." });
    }
  } catch (error) {
    console.error("Failed to retrieve report:", error);
    res.status(500).json({ error: "Failed to retrieve report." });
  }
});

initializeDatabase().then(database => {
  db = database;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});