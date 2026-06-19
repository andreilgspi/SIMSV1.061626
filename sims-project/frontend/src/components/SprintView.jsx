// src/components/SprintView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SprintView = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [availableSprints, setAvailableSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw error;
      
      const allTasks = data || [];
      setTasks(allTasks);
      
      const sprints = [...new Set(allTasks.map(t => t.sprint).filter(Boolean))];
      setAvailableSprints(sprints);
      if (sprints.length > 0) setSelectedSprint(sprints[0]);

    } catch (error) {
      console.error("Error fetching tasks:", error.message);
    } finally {
      setLoading(false);
    }
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
        <select 
          className="ios-table-select" 
          value={selectedSprint} 
          onChange={(e) => setSelectedSprint(e.target.value)}
        >
          {availableSprints.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <h4>Total Tasks</h4>
          <p className="metric-value">{totalTasks}</p>
        </div>
        <div className="metric-card done">
          <h4>Completed</h4>
          <p className="metric-value">{completed}</p>
        </div>
        <div className="metric-card in-progress">
          <h4>In Progress</h4>
          <p className="metric-value">{inProgress}</p>
        </div>
        <div className="metric-card blocked">
          <h4>Blocked</h4>
          <p className="metric-value">{blocked}</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Not Started</h4>
          <p className="metric-value">{notStarted}</p>
        </div>
        <div className="metric-card in-progress">
          <h4>Total Pts</h4>
          <p className="metric-value">{totalPts}</p>
        </div>
        <div className="metric-card done">
          <h4>Velocity</h4>
          <p className="metric-value">{velocity}</p>
        </div>
        <div className="metric-card done">
          <h4>% Complete</h4>
          <p className="metric-value">{percentComplete}%</p>
        </div>
      </div>

      {/* Read Only Table for the specific sprint */}
      <div className="ios-card" style={{ marginTop: '24px' }}>
        <h3 style={{ padding: '16px', margin: 0, borderBottom: '1px solid #eee', background: '#f8f8fa' }}>SPRINT BREAKDOWN</h3>
        
        {/* ADDED: Scrollable Container and Tracker Table classes */}
        <div className="scrollable-table-container" style={{ border: 'none' }}>
          <table className="ios-table tracker-table">
            <thead>
              <tr>
                {/* ADDED: Explicit Alignments */}
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ textAlign: 'left' }}>Task Name</th>
                <th style={{ width: '200px', textAlign: 'left' }}>Assignee(s)</th>
                <th style={{ width: '150px', textAlign: 'left' }}>Phase</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Story Pts</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Priority</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => (
                <tr key={task.id}>
                  {/* ADDED: Explicit Alignments matching headers */}
                  <td style={{ textAlign: 'center', color: '#8e8e93' }}>{index + 1}</td>
                  <td style={{ textAlign: 'left', fontWeight: 500 }}>{task.task_name || '—'}</td>
                  <td style={{ textAlign: 'left' }}>{task.assignees && task.assignees.length > 0 ? task.assignees.join(', ') : '—'}</td>
                  <td style={{ textAlign: 'left' }}>{task.phase}</td>
                  <td style={{ textAlign: 'center' }}><span className="badge-count">{task.story_points}</span></td>
                  <td style={{ textAlign: 'center' }}><span className={`ios-badge priority-${(task.priority || 'Medium').toLowerCase()}`}>{task.priority}</span></td>
                  <td style={{ textAlign: 'center' }}><span className={`ios-badge status-${(task.status || 'To Do').toLowerCase().replace(' ', '-')}`}>{task.status}</span></td>
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