const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ============== TASKS API ==============

// GET all tasks
app.get('/api/tasks', (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY id", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET single task
app.get('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(row);
  });
});

// POST new task
app.post('/api/tasks', (req, res) => {
  const { phase, task_id, task_name, start_date, end_date, predecessors, duration, owner, percent_complete, status, notes } = req.body;
  
  db.run(`
    INSERT INTO tasks (phase, task_id, task_name, start_date, end_date, predecessors, duration, owner, percent_complete, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [phase, task_id, task_name, start_date, end_date, predecessors, duration, owner, percent_complete || 0, status || 'Not Started', notes || ''], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Task created successfully' });
  });
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { phase, task_id, task_name, start_date, end_date, predecessors, duration, owner, percent_complete, status, notes } = req.body;
  
  db.run(`
    UPDATE tasks 
    SET phase = ?, task_id = ?, task_name = ?, start_date = ?, end_date = ?, predecessors = ?, duration = ?, owner = ?, percent_complete = ?, status = ?, notes = ?
    WHERE id = ?
  `, [phase, task_id, task_name, start_date, end_date, predecessors, duration, owner, percent_complete, status, notes, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task updated successfully' });
  });
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM tasks WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// ============== DASHBOARD METRICS API ==============

// GET phase summary
app.get('/api/phases', (req, res) => {
  db.all(`
    SELECT 
      phase,
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'Complete' THEN 1 ELSE 0 END) as complete_count,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
      SUM(CASE WHEN status = 'Not Started' THEN 1 ELSE 0 END) as not_started_count,
      AVG(percent_complete) as avg_percent_complete,
      MIN(start_date) as phase_start,
      MAX(end_date) as phase_end
    FROM tasks
    GROUP BY phase
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Add completion rate calculation
    const phasesWithRates = rows.map(phase => ({
      ...phase,
      completion_rate: phase.total_tasks > 0 ? (phase.complete_count / phase.total_tasks) * 100 : 0
    }));
    
    res.json(phasesWithRates);
  });
});

// GET overall dashboard metrics
app.get('/api/dashboard/metrics', (req, res) => {
  db.all("SELECT * FROM tasks", (err, tasks) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Calculate metrics
    const totalTasks = tasks.length;
    const completeTasks = tasks.filter(t => t.status === 'Complete').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'Not Started').length;
    const overallCompletionRate = totalTasks > 0 ? tasks.reduce((sum, t) => sum + t.percent_complete, 0) / totalTasks : 0;
    
    // Get project start and end dates (min start, max end)
    const startDates = tasks.map(t => new Date(t.start_date));
    const endDates = tasks.map(t => new Date(t.end_date));
    const projectStart = new Date(Math.min(...startDates));
    const projectEnd = new Date(Math.max(...endDates));
    
    // Calculate elapsed days
    const today = new Date();
    const totalElapsedDays = Math.floor((today - projectStart) / (1000 * 60 * 60 * 24));
    
    // Calculate working days (Monday-Friday)
    let workingDaysElapsed = 0;
    const currentDate = new Date(projectStart);
    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDaysElapsed++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const approxHoursRendered = workingDaysElapsed * 8;
    
    // Calculate schedule status (based on actual vs planned)
    const totalDuration = Math.floor((projectEnd - projectStart) / (1000 * 60 * 60 * 24));
    const plannedCompletion = totalDuration > 0 ? (totalElapsedDays / totalDuration) * 100 : 0;
    
    let scheduleStatus = 'On Track';
    if (overallCompletionRate > plannedCompletion + 10) scheduleStatus = 'Ahead';
    else if (overallCompletionRate < plannedCompletion - 10) scheduleStatus = 'At Risk';
    else if (overallCompletionRate < plannedCompletion - 25) scheduleStatus = 'Behind';
    
    res.json({
      projectTitle: 'SIMS PROJECT DASHBOARD',
      subDescription: 'Smart Inventory Management System | Live Project Tracker',
      projectStart: projectStart.toLocaleDateString(),
      projectEnd: projectEnd.toLocaleDateString(),
      scheduleStatus,
      totalElapsedDays: Math.max(0, totalElapsedDays),
      workingDaysElapsed,
      approxHoursRendered,
      totalTasks,
      completeTasks,
      inProgressTasks,
      notStartedTasks,
      overallCompletionRate: Math.round(overallCompletionRate),
      overdueTasks: tasks.filter(t => new Date(t.end_date) < today && t.status !== 'Complete').length
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});