import React, { useState, useEffect } from 'react';
import './dashboard.css';

function Dashboard({ tasks }) {
  const [metrics, setMetrics] = useState(null);
  const [phases, setPhases] = useState([]);

  useEffect(() => {
    fetchMetrics();
    fetchPhases();
  }, [tasks]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchPhases = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/phases');
      const data = await response.json();
      setPhases(data);
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  };

  if (!metrics) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{metrics.projectTitle}</h1>
          <p>{metrics.subDescription}</p>
        </div>
        <div className="date-started">
          Started: {metrics.projectStart}
        </div>
      </div>

      <div className="hero-section">
        <div className="card timeline-card">
          <h3>TIMELINE & SCHEDULE</h3>
          <div className="timeline-grid">
            <div className="timeline-item">
              <span className="label">Project Start</span>
              <span className="value">{metrics.projectStart}</span>
            </div>
            <div className="timeline-item">
              <span className="label">Project End</span>
              <span className="value">{metrics.projectEnd}</span>
            </div>
            <div className="timeline-item">
              <span className="label">Schedule Status</span>
              <span className={`value status-${metrics.scheduleStatus.toLowerCase().replace(' ', '')}`}>
                {metrics.scheduleStatus}
              </span>
            </div>
            <div className="timeline-item">
              <span className="label">Total Elapsed (Days)</span>
              <span className="value">{metrics.totalElapsedDays}</span>
            </div>
            <div className="timeline-item">
              <span className="label">Working Days Elapsed</span>
              <span className="value">{metrics.workingDaysElapsed}</span>
            </div>
            <div className="timeline-item">
              <span className="label">Approx. Hours Rendered</span>
              <span className="value">{metrics.approxHoursRendered}</span>
            </div>
          </div>
        </div>

        <div className="card task-counts-card">
          <h3>TASK COUNTS & COMPLETION</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-number">{metrics.totalTasks}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat">
              <span className="stat-number">{metrics.completeTasks}</span>
              <span className="stat-label">Complete</span>
            </div>
            <div className="stat">
              <span className="stat-number">{metrics.inProgressTasks}</span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat">
              <span className="stat-number">{metrics.notStartedTasks}</span>
              <span className="stat-label">Not Started</span>
            </div>
            <div className="stat">
              <span className="stat-number">{metrics.overallCompletionRate}%</span>
              <span className="stat-label">Completion Rate</span>
            </div>
            <div className="stat">
              <span className="stat-number">{metrics.overdueTasks}</span>
              <span className="stat-label">Overdue Tasks</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card phase-summary-card">
        <h3>PHASE SUMMARY</h3>
        <table className="phase-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Total Tasks</th>
              <th>Complete</th>
              <th>In Progress</th>
              <th>Not Started</th>
              <th>Avg % Complete</th>
              <th>Completion Rate</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase, idx) => (
              <tr key={idx}>
                <td>{phase.phase}</td>
                <td>{phase.total_tasks}</td>
                <td>{phase.complete_count}</td>
                <td>{phase.in_progress_count}</td>
                <td>{phase.not_started_count}</td>
                <td>{Math.round(phase.avg_percent_complete)}%</td>
                <td>{Math.round(phase.completion_rate)}%</td>
                <td>{new Date(phase.phase_start).toLocaleDateString()}</td>
                <td>{new Date(phase.phase_end).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default dashboard;