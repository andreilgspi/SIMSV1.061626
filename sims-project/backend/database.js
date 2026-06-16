const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sims.db');
const db = new sqlite3.Database(dbPath);

// Create tasks table
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL,
    task_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    predecessors TEXT,
    duration INTEGER NOT NULL,
    owner TEXT NOT NULL,
    percent_complete INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Not Started',
    notes TEXT
  )
`);

// Insert sample data from your image
const sampleTasks = [
  // Initiation Phase
  ['Initiation', '1', 'Project Kickoff', '2026-05-14', '2026-05-14', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.1', 'Define preliminary resources', '2026-05-15', '2026-05-15', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.11', 'Internal planning and consolidation', '2026-05-18', '2026-05-19', '', 2, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.12', 'SI 1 - Accounts Payable', '2026-05-19', '2026-05-19', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.13', 'SI 2 - Inventory: Perishable', '2026-05-21', '2026-05-21', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.14', 'SI 3 - Accounts Receivable 1', '2026-05-25', '2026-05-25', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.15', 'SI 4 - Inventory: Non-Perishable', '2026-05-28', '2026-05-28', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.16', 'SI 5 - Accounts Receivable 2', '2026-06-01', '2026-06-01', '', 1, 'PM', 100, 'Complete', ''],
  ['Initiation', '1.17', '[S1] Design and Requirements: AP', '2026-06-03', '2026-06-05', '', 3, 'UI UX', 85, 'In Progress', ''],
  ['Initiation', '1.18', '[S1] Design and Requirements: AR', '2026-06-08', '2026-06-10', '', 3, 'UI UX', 25, 'In Progress', ''],
  ['Initiation', '1.19', '[S1] Design and Requirements: Inventory', '2026-06-11', '2026-06-15', '', 3, 'UI UX', 0, 'Not Started', ''],
  ['Initiation', '1.2', '[S1] Design and Requirements: Peripherals', '2026-06-16', '2026-06-17', '', 2, 'UI UX', 0, 'Not Started', ''],
  ['Initiation', '1.21', 'MF Excel: Item, Supplier, Employee', '2026-06-04', '2026-06-23', '', 14, 'PM', 0, 'Not Started', ''],
  ['Initiation', '1.22', 'BRD creation', '2026-06-03', '2026-06-11', '', 7, 'PM', 0, 'In Progress', ''],
  ['Initiation', '1.23', 'BRD sign-off and client proposal', '2026-06-18', '2026-06-18', '', 1, 'PM', 0, 'Not Started', ''],
  ['Initiation', '1.24', 'Adjustment and buffer time', '2026-06-18', '2026-06-23', '', 4, 'Team', 0, 'Not Started', ''],
  ['Initiation', '1.25', 'SRS creation, finalized reports list', '2026-06-11', '2026-06-19', '1.23, 1.24', 7, 'PM', 0, 'Not Started', ''],
  // P1 Prerequisites
  ['[P1] Prerequisites', '2', 'Internal planning and onboarding', '2026-06-23', '2026-06-25', '1.23, 1.26', 3, 'Team', 0, 'Not Started', ''],
  ['[P1] Prerequisites', '2.1', 'Masterfile acceleration sprint', '2026-05-25', '2026-06-15', '', 16, 'KC, Jess', 0, 'Not Started', ''],
  ['[P1] Prerequisites', '2.2', 'Users, user group, and configuration development', '2026-06-16', '2026-07-06', '2.1', 15, 'Jess, KC, Franco', 0, 'Not Started', ''],
  ['[P1] Prerequisites', '2.3', 'Client deliverables: MF excel (item, supplier, emp)', '2026-06-24', '2026-07-21', '1.21', 20, 'Mayon', 0, 'Not Started', ''],
  ['[P1] Prerequisites', '2.4', 'MF Excel: Customer', '2026-07-22', '2026-08-18', '2.3', 20, 'Mayon', 0, 'Not Started', ''],
  ['[P1] Prerequisites', '2.5', 'Testing: MF, Users, and Configuration', '2026-06-19', '2026-07-02', '1.23', 10, 'Rica, QA 2', 0, 'Not Started', ''],
  // P2 AP
  ['[P2] AP', '3', 'Accounts Payable: Kick-off meeting', '2026-07-07', '2026-07-07', '2.2', 1, 'Team', 0, 'Not Started', ''],
  ['[P2] AP', '3.1', 'PR, PO, and RR development', '2026-07-08', '2026-07-21', '3', 10, 'Jess, KC, Franco', 0, 'Not Started', ''],
  ['[P2] AP', '3.2', 'Adjustment: MF, Users, and Configuration', '2026-07-22', '2026-07-28', '3.1', 5, 'Jess, KC, Franco', 0, 'Not Started', ''],
];

// Insert sample data if table is empty
db.get("SELECT COUNT(*) as count FROM tasks", (err, row) => {
  if (err) {
    console.error('Error checking tasks:', err);
    return;
  }
  
  if (row.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO tasks (phase, task_id, task_name, start_date, end_date, predecessors, duration, owner, percent_complete, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    sampleTasks.forEach(task => {
      insertStmt.run(task);
    });
    
    insertStmt.finalize();
    console.log('Sample data inserted successfully');
  } else {
    console.log('Tasks table already has data, skipping sample insertion');
  }
});

module.exports = db;