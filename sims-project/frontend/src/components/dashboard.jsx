import React, { useState, useEffect } from 'react';
import './dashboard.css';

function Dashboard({ tasks, selectedProject }) {
  const [metrics, setMetrics] = useState(null);
  const [phases, setPhases] = useState([]);

  useEffect(() => {
    if (tasks.length > 0) {
      calculateMetrics();
      calculatePhases();
    } else {
      setMetrics(null);
      setPhases([]);
    }
  }, [tasks]);

  const calculateMetrics = () => {
    const totalTasks = tasks.length;
    const completeTasks = tasks.filter(t => t.status === 'Complete').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'Not Started').length;
    
    const avgPercentComplete = totalTasks > 0 
      ? Math.round((completeTasks / totalTasks) * 100) 
      : 0;
    
    const totalPercentComplete = tasks.reduce((sum, t) => sum + t.percent_complete, 0);
    const completionRate = totalTasks > 0 
      ? Math.round(totalPercentComplete / totalTasks) 
      : 0;
    
    const startDates = tasks.map(t => new Date(t.start_date));
    const endDates = tasks.map(t => new Date(t.end_date));
    const projectStart = new Date(Math.min(...startDates));
    const projectEnd = new Date(Math.max(...endDates));
    
    const today = new Date();
    const totalElapsedDays = Math.floor((today - projectStart) / (1000 * 60 * 60 * 24));
    
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
    
    const totalDuration = Math.floor((projectEnd - projectStart) / (1000 * 60 * 60 * 24));
    const plannedCompletion = totalDuration > 0 ? (totalElapsedDays / totalDuration) * 100 : 0;
    
    let scheduleStatus = 'On Track';
    let statusColor = '#34c759';
    if (avgPercentComplete > plannedCompletion + 10) {
      scheduleStatus = 'Ahead';
      statusColor = '#34c759';
    } else if (avgPercentComplete < plannedCompletion - 10) {
      scheduleStatus = 'At Risk';
      statusColor = '#ff9500';
    } else if (avgPercentComplete < plannedCompletion - 25) {
      scheduleStatus = 'Behind';
      statusColor = '#ff3b30';
    }
    
    setMetrics({
      projectTitle: selectedProject ? selectedProject.name : 'SIMS PROJECT DASHBOARD',
      subDescription: selectedProject?.description || 'Smart Inventory Management System | Live Project Tracker',
      // FULL DATE FORMAT - Month Day, Year
      projectStart: projectStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      projectEnd: projectEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      scheduleStatus,
      statusColor,
      totalElapsedDays: Math.max(0, totalElapsedDays),
      workingDaysElapsed,
      approxHoursRendered,
      totalTasks,
      completeTasks,
      inProgressTasks,
      notStartedTasks,
      overallCompletionRate: avgPercentComplete,
      completionRate: completionRate,
      overdueTasks: tasks.filter(t => new Date(t.end_date) < today && t.status !== 'Complete').length
    });
  };

  const calculatePhases = () => {
    const phaseMap = {};
    
    tasks.forEach(task => {
      const phaseName = task.phase_name || task.phase || 'Unknown';
      if (!phaseMap[phaseName]) {
        phaseMap[phaseName] = {
          phase: phaseName,
          total_tasks: 0,
          complete_count: 0,
          in_progress_count: 0,
          not_started_count: 0,
          total_percent: 0,
          phase_start: task.start_date,
          phase_end: task.end_date
        };
      }
      
      const p = phaseMap[phaseName];
      p.total_tasks++;
      p.total_percent += task.percent_complete;
      
      if (task.status === 'Complete') p.complete_count++;
      else if (task.status === 'In Progress') p.in_progress_count++;
      else if (task.status === 'Not Started') p.not_started_count++;
      
      if (new Date(task.start_date) < new Date(p.phase_start)) p.phase_start = task.start_date;
      if (new Date(task.end_date) > new Date(p.phase_end)) p.phase_end = task.end_date;
    });
    
    const phasesArray = Object.values(phaseMap).map(p => ({
      ...p,
      avg_percent_complete: p.total_tasks > 0 
        ? Math.round((p.complete_count / p.total_tasks) * 100) 
        : 0,
      completion_rate: Math.round(p.total_percent / p.total_tasks),
      // FULL DATE FORMAT for phase dates
      phase_start_formatted: new Date(p.phase_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      phase_end_formatted: new Date(p.phase_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }));
    
    setPhases(phasesArray);
  };

  const getPhaseColor = (phaseName, index) => {
    const colors = ['#007aff', '#5856d6', '#ff2d55', '#ff9500', '#34c759', '#30b0c0', '#af52de'];
    return colors[index % colors.length];
  };

  if (!metrics && tasks.length === 0) {
    return (
      <div className="dashboard">
        <div className="no-tasks-message">
          <h2>No Tasks Yet</h2>
          <p>This project has no tasks. Go to the <strong>Workbook</strong> tab to add tasks.</p>
        </div>
      </div>
    );
  }

  if (!metrics) return <div className="loading">Loading dashboard...</div>;

  // Calculate donut chart data
  const total = metrics.totalTasks || 1;
  const completePct = (metrics.completeTasks / total) * 100;
  const inProgressPct = (metrics.inProgressTasks / total) * 100;
  const notStartedPct = (metrics.notStartedTasks / total) * 100;

  // SVG donut chart parameters
  const radius = 40;
  const center = 50;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke-dasharray and offset for each segment
  const completeOffset = 0;
  const completeDash = (completePct / 100) * circumference;
  const inProgressOffset = completeDash;
  const inProgressDash = (inProgressPct / 100) * circumference;
  const notStartedOffset = completeDash + inProgressDash;
  const notStartedDash = (notStartedPct / 100) * circumference;

  return (
    <div className="dashboard">
      {/* Timeline & Schedule - ENHANCED */}
      <div className="timeline-section">
        <h2 className="section-title">TIMELINE & SCHEDULE</h2>
        <div className="timeline-grid">
          <div className="timeline-item">
            <span className="timeline-value blue">{metrics.projectStart}</span>
            <span className="timeline-label">PROJECT START</span>
          </div>
          <div className="timeline-item">
            <span className="timeline-value green">{metrics.projectEnd}</span>
            <span className="timeline-label">PROJECT END</span>
          </div>
          <div className="timeline-item">
            <span className="timeline-value status-badge" style={{ backgroundColor: metrics.statusColor }}>
              {metrics.scheduleStatus}
            </span>
            <span className="timeline-label">SCHEDULE STATUS</span>
          </div>
          <div className="timeline-item">
            <span className="timeline-value orange">{metrics.totalElapsedDays}</span>
            <span className="timeline-label">TOTAL ELAPSED (DAYS)</span>
          </div>
          <div className="timeline-item">
            <span className="timeline-value purple">{metrics.workingDaysElapsed}</span>
            <span className="timeline-label">WORKING DAYS ELAPSED</span>
          </div>
          <div className="timeline-item">
            <span className="timeline-value pink">{metrics.approxHoursRendered}</span>
            <span className="timeline-label">APPROX. HOURS RENDERED</span>
          </div>
        </div>
      </div>

      {/* Task Counts & Completion - ENHANCED */}
      <div className="task-section">
        <h2 className="section-title">TASK COUNTS & COMPLETION</h2>
        <div className="task-counts-grid">
          <div className="task-count-item">
            <span className="task-count-number">{metrics.totalTasks}</span>
            <span className="task-count-label">TOTAL TASKS</span>
          </div>
          <div className="task-count-item">
            <span className="task-count-number complete">{metrics.completeTasks}</span>
            <span className="task-count-label">COMPLETE</span>
          </div>
          <div className="task-count-item">
            <span className="task-count-number in-progress">{metrics.inProgressTasks}</span>
            <span className="task-count-label">IN PROGRESS</span>
          </div>
          <div className="task-count-item">
            <span className="task-count-number not-started">{metrics.notStartedTasks}</span>
            <span className="task-count-label">NOT STARTED</span>
          </div>
          <div className="task-count-item">
            <span className="task-count-number highlight">{metrics.completionRate}%</span>
            <span className="task-count-label">COMPLETION RATE</span>
          </div>
          <div className="task-count-item">
            <span className="task-count-number warning">{metrics.overdueTasks}</span>
            <span className="task-count-label">OVERDUE TASKS</span>
          </div>
        </div>
      </div>

      {/* Phase Summary Section */}
      <div className="section">
        <h2 className="section-title">PHASE SUMMARY</h2>
        <div className="table-wrapper">
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
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase, idx) => {
                const color = getPhaseColor(phase.phase, idx);
                return (
                  <tr key={idx}>
                    <td className="phase-name">{phase.phase}</td>
                    <td>{phase.total_tasks}</td>
                    <td className="complete-text">{phase.complete_count}</td>
                    <td className="progress-text">{phase.in_progress_count}</td>
                    <td className="notstarted-text">{phase.not_started_count}</td>
                    <td>{phase.avg_percent_complete}%</td>
                    <td className="completion-text">{phase.completion_rate}%</td>
                    <td>{phase.phase_start_formatted}</td>
                    <td>{phase.phase_end_formatted}</td>
                    <td>
                      <div className="progress-bar-mini">
                        <div 
                          className="progress-bar-mini-fill" 
                          style={{ 
                            width: `${phase.completion_rate}%`,
                            backgroundColor: color
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-row">
        {/* Task Status by Phase */}
        <div className="chart-card">
          <h3>Task Status by Phase</h3>
          <div className="chart-bars">
            {phases.map((phase, idx) => {
              const total = phase.total_tasks || 1;
              const completePct = Math.round((phase.complete_count / total) * 100);
              const inProgressPct = Math.round((phase.in_progress_count / total) * 100);
              const notStartedPct = Math.round((phase.not_started_count / total) * 100);
              
              return (
                <div key={idx} className="chart-bar-row">
                  <span className="chart-bar-label">{phase.phase.replace('[P', 'P').replace(']', '')}</span>
                  <div className="chart-bar-track">
                    {completePct > 0 && (
                      <div className="chart-bar-segment complete" style={{ width: `${completePct}%` }}></div>
                    )}
                    {inProgressPct > 0 && (
                      <div className="chart-bar-segment in-progress" style={{ width: `${inProgressPct}%` }}></div>
                    )}
                    {notStartedPct > 0 && (
                      <div className="chart-bar-segment not-started" style={{ width: `${notStartedPct}%` }}></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chart-legend">
            <span><span className="legend-dot complete"></span> Complete</span>
            <span><span className="legend-dot in-progress"></span> In Progress</span>
            <span><span className="legend-dot not-started"></span> Not Started</span>
          </div>
        </div>

        {/* Overall Status Mix - FIXED DONUT CHART */}
        <div className="chart-card">
          <h3>Overall Status Mix</h3>
          <div className="donut-chart-container">
            <div className="donut-chart">
              <svg viewBox="0 0 100 100" width="160" height="160">
                {/* Background circle */}
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e9ecef" strokeWidth="16" />
                
                {/* Complete segment - Green */}
                {completePct > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="none" 
                    stroke="#34c759" 
                    strokeWidth="16"
                    strokeDasharray={`${completeDash} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                )}
                
                {/* In Progress segment - Orange */}
                {inProgressPct > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="none" 
                    stroke="#ff9500" 
                    strokeWidth="16"
                    strokeDasharray={`${inProgressDash} ${circumference}`}
                    strokeDashoffset={-completeDash}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                )}
                
                {/* Not Started segment - Gray */}
                {notStartedPct > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="none" 
                    stroke="#e9ecef" 
                    strokeWidth="16"
                    strokeDasharray={`${notStartedDash} ${circumference}`}
                    strokeDashoffset={-(completeDash + inProgressDash)}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                )}
                
                {/* Center white circle */}
                <circle cx="50" cy="50" r="28" fill="white" />
                
                {/* Center text */}
                <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1c1c1e">
                  {metrics.completionRate}%
                </text>
                <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#8e8e93" fontWeight="500">
                  Complete
                </text>
              </svg>
            </div>
            <div className="donut-legend">
              <div className="donut-legend-item">
                <span className="legend-dot complete"></span>
                <span className="legend-label">Complete ({metrics.completeTasks})</span>
              </div>
              <div className="donut-legend-item">
                <span className="legend-dot in-progress"></span>
                <span className="legend-label">In Progress ({metrics.inProgressTasks})</span>
              </div>
              <div className="donut-legend-item">
                <span className="legend-dot not-started"></span>
                <span className="legend-label">Not Started ({metrics.notStartedTasks})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Average Completion % per Phase */}
        <div className="chart-card">
          <h3>Average Completion % per Phase</h3>
          <div className="completion-chart">
            {phases.map((phase, idx) => {
              const color = getPhaseColor(phase.phase, idx);
              return (
                <div key={idx} className="completion-bar-row">
                  <span className="completion-bar-label">{phase.phase.replace('[P', 'P').replace(']', '')}</span>
                  <div className="completion-bar-track">
                    <div 
                      className="completion-bar-fill" 
                      style={{ 
                        width: `${phase.completion_rate}%`,
                        backgroundColor: color
                      }}
                    ></div>
                    <span className="completion-bar-value">{phase.completion_rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;