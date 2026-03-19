const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DB_FILE = process.env.DATABASE_PATH || path.join(__dirname, '../data/cheapbasket.db');
const BACKUP_DIR = path.join(__dirname, '../backup');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupFile = path.join(BACKUP_DIR, `cheapbasket_backup_${timestamp}.db`);

  console.log(`[Backup Service] Starting backup: ${backupFile}`);

  // Using sqlite3 command line tool to create a clean backup
  exec(`sqlite3 ${DB_FILE} ".backup '${backupFile}'"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Backup Service] Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[Backup Service] Stderr: ${stderr}`);
      return;
    }

    console.log(`[Backup Service] Backup successful: ${backupFile}`);

    // Optional: Clean up old backups (e.g., keep last 7 days)
    cleanOldBackups(BACKUP_DIR, 7);
  });
}

function cleanOldBackups(directory, maxDays) {
  const now = Date.now();
  const maxAge = maxDays * 24 * 60 * 60 * 1000;

  fs.readdirSync(directory).forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;

    if (age > maxAge) {
      console.log(`[Backup Service] Deleting old backup: ${file}`);
      fs.unlinkSync(filePath);
    }
  });
}

module.exports = { backupDatabase };
