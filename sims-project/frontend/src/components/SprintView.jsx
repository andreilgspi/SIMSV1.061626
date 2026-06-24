// src/components/SprintView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SprintView = ({ selectedProject }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [availableSprints, setAvailableSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject) fetchTasks();
  }, [selectedProject]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('project_id', selectedProject.id);
      if (error) throw error;
      const allTasks = data || [];
      setTasks(allTasks);
      const sprints = [...new Set(allTasks.map(t => t.sprint).filter(Boolean))];
      setAvailableSprints(sprints);
      if (sprints.length > 0) setSelectedSprint(sprints[0]);
    } catch (error) { console.error("Error fetching tasks:", error.message); } 
    finally { setLoading(false); }
  };

  const filteredTasks = tasks.filter(t => t.sprint === selectedSprint);
  const totalTasks = filteredTasks.length;
  const completed = filteredTasks.filter(t => t.status === 'Done').length;
  const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
  const blocked = filteredTasks.filter(t => t.status === 'Blocked').length;
  const notStarted = filteredTasks.filter(t => t.status === 'To Do').length;
  const percentComplete = totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);
  const totalPts = filteredTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const velocity = filteredTasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.story_points || 0), 0);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Sprint Data...</div>;

  return (
    <div>
      <div className="sprint-selector-container">
        <h3>SELECT SPRINT TO VIEW</h3>
        <select className="ios-table-select" value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)}>
          {availableSprints.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="metrics-grid">
        <div className="metric-card primary"><h4>Total Tasks</h4><p className="metric-value">{totalTasks}</p></div>
        <div className="metric-card done"><h4>Completed</h4><p className="metric-value">{completed}</p></div>
        <div className="metric-card in-progress"><h4>In Progress</h4><p className="metric-value">{inProgress}</p></div>
        <div className="metric-card blocked"><h4>Blocked</h4><p className="metric-value">{blocked}</p></div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card"><h4>Not Started</h4><p className="metric-value">{notStarted}</p></div>
        <div className="metric-card in-progress"><h4>Total Pts</h4><p className="metric-value">{totalPts}</p></div>
        <div className="metric-card done"><h4>Velocity</h4><p className="metric-value">{velocity}</p></div>
        <div className="metric-card done"><h4>% Complete</h4><p className="metric-value">{percentComplete}%</p></div>
      </div>
      <div className="ios-card" style={{ marginTop: '24px' }}>
        <h3 style={{ padding: '16px', margin: 0, borderBottom: '1px solid #eee', background: '#f8f8fa' }}>SPRINT BREAKDOWN</h3>
        <div className="table-responsive">
          <table className="ios-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th><th>Task Name</th><th>Assignee(s)</th><th>Phase</th>
                <th style={{ textAlign: 'center' }}>Story Pts</th><th>Priority</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => (
                <tr key={task.id}>
                  <td style={{ color: '#8e8e93' }}>{index + 1}</td>
                  <td style={{ fontWeight: 500 }}>{task.task_name || '—'}</td>
                  <td>{task.assignees ? task.assignees.join(', ') : '—'}</td>
                  <td>{task.phase}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge-count">{task.story_points}</span></td>
                  <td><span className={`ios-badge priority-${(task.priority || 'Medium').toLowerCase()}`}>{task.priority}</span></td>
                  <td><span className={`ios-badge status-${(task.status || 'To Do').toLowerCase().replace(' ', '-')}`}>{task.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default SprintView;