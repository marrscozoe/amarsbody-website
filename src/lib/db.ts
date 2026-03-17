import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'contact_submissions.db');
const db = new Database(dbPath);

// Create submissions table
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    replied_at DATETIME
  )
`);

export default db;
