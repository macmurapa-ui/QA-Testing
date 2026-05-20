const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'qa_runs.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id     TEXT    NOT NULL,
    test_name   TEXT    NOT NULL,
    script      TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'running',
    started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_ms INTEGER,
    output      TEXT,
    failure_summary TEXT
  )
`);

module.exports = {
  createRun(test_id, script, test_name) {
    return db.prepare(
      `INSERT INTO runs (test_id, test_name, script, status, started_at)
       VALUES (?, ?, ?, 'running', datetime('now'))`
    ).run(test_id, script, test_name).lastInsertRowid;
  },

  completeRun(id, status, output, failure_summary) {
    db.prepare(
      `UPDATE runs SET
         status         = ?,
         completed_at   = datetime('now'),
         duration_ms    = CAST((julianday('now') - julianday(started_at)) * 86400000 AS INTEGER),
         output         = ?,
         failure_summary = ?
       WHERE id = ?`
    ).run(status, output, failure_summary, id);
  },

  getRun(id) {
    return db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
  },

  getRuns(limit, offset, test_id) {
    if (test_id) {
      return db.prepare(
        `SELECT * FROM runs WHERE test_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?`
      ).all(test_id, limit, offset);
    }
    return db.prepare(
      `SELECT * FROM runs ORDER BY started_at DESC LIMIT ? OFFSET ?`
    ).all(limit, offset);
  },

  getLastRunPerTest() {
    return db.prepare(
      `SELECT r.* FROM runs r
       INNER JOIN (
         SELECT test_id, MAX(id) as max_id
         FROM runs WHERE status != 'running'
         GROUP BY test_id
       ) latest ON r.id = latest.max_id`
    ).all();
  },

  getStats() {
    return db.prepare(
      `SELECT
         COUNT(*)                                        AS total_runs,
         COUNT(CASE WHEN status = 'pass' THEN 1 END)    AS passes,
         COUNT(CASE WHEN status = 'fail' THEN 1 END)    AS failures,
         COUNT(CASE WHEN status = 'running' THEN 1 END) AS running
       FROM runs`
    ).get();
  }
};
