// in database.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function initializeDatabase() {
  const db = await open({
    filename: './analyzer.db',
    driver: sqlite3.Database
  });

  // The PRD suggests a minimal schema for uploads and reports.
  // We add 'raw_data_json' to store the parsed content.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      raw_data_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      upload_id TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (upload_id) REFERENCES uploads (id)
    );
  `);

  console.log("Database initialized successfully.");
  return db;
}

module.exports = { initializeDatabase };