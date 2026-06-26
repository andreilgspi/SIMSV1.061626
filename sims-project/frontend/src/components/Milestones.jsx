import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fetchPhasesByProject } from '../services/database';
import './Milestones.css';

function Milestones({ selectedProject }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject) {
      fetchMilestones();
    }
  }, [selectedProject]);

  const fetchMilestones = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const { data: milestonesData, error } = await supabase
        .from('workbook')
        .select('*')
        .eq('project_id', selectedProject.id)
        .eq('is_milestone', 1)
        .order('id');
      
      if (error) throw error;
      
      const phasesData = await fetchPhasesByProject(selectedProject.id);
      
      const formattedData = milestonesData.map(task => {
        const phase = phasesData.find(p => p.id === task.phase_id);
        return {
          ...task,
          phase_name: phase ? phase.name : 'Unknown Phase'
        };
      });
      
      setMilestones(formattedData);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseStyle = (phaseId) => {
    const palette = [
      { bg: 'rgba(0, 122, 255, 0.12)',   color: '#007aff' },
      { bg: 'rgba(52, 199, 89, 0.12)',   color: '#34c759' },
      { bg: 'rgba(255, 149, 0, 0.12)',   color: '#ff9500' },
      { bg: 'rgba(255, 59, 48, 0.12)',   color: '#ff3b30' },
      { bg: 'rgba(88, 86, 214, 0.12)',   color: '#5856d6' },
      { bg: 'rgba(255, 45, 85, 0.12)',   color: '#ff2d55' },
      { bg: 'rgba(48, 176, 192, 0.12)',  color: '#30b0c0' },
      { bg: 'rgba(175, 82, 222, 0.12)',  color: '#af52de' },
    ];
    const index = (phaseId - 1) % palette.length;
    return palette[index >= 0 ? index : 0];
  };

  const getStatusColor = (status) => {
    const colors = {
      'Complete': '#34c759',
      'In Progress': '#ff9500',
      'Not Started': '#8e8e93',
      'Blocked': '#ff3b30'
    };
    return colors[status] || '#8e8e93';
  };

  if (!selectedProject) {
    return (
      <div className="milestones">
        <div className="no-project-message">
          <h2>No Project Selected</h2>
          <p>Please select a project to view milestones.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading milestones...</div>;
  }

  return (
    <div className="milestones">
      <div className="milestones-header">
        <div>
          <h2>Milestones</h2>
          <p className="project-context">{selectedProject.name}</p>
        </div>
        <div className="milestone-count">
          {milestones.length} {milestones.length === 1 ? 'Milestone' : 'Milestones'}
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="no-milestones-message">
          <p>No milestones yet for this project.</p>
          <p>Go to the <strong>Workbook</strong> tab and mark tasks as milestones.</p>
        </div>
      ) : (
        <div className="tasks-table-container">
          <table className="tasks-table">
  <thead>
    <tr>
      <th>Phase</th>
      <th>Task ID</th>
      <th>Task Name</th>
      <th>Start Date</th>
      <th>End Date</th>
      <th>% Complete</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {milestones.map((task) => {
      const phaseStyle = getPhaseStyle(task.phase_id);
      return (
        <tr key={task.id}>
          <td>
            <span className="phase-button" style={phaseStyle}>
              {task.phase_name || 'Unknown Phase'}
            </span>
          </td>
          <td>{task.task_id}</td>
          <td>{task.task_name}</td>
          <td>{new Date(task.start_date).toLocaleDateString()}</td>
          <td>{new Date(task.end_date).toLocaleDateString()}</td>
          <td>
            <div className="progress-bar-cell">
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${task.percent_complete}%` }}
                ></div>
              </div>
              <span className="progress-bar-text">{task.percent_complete}%</span>
            </div>
          </td>
          <td>
            <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
              {task.status}
            </span>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
        </div>
      )}
    </div>
  );
}

export default Milestones;