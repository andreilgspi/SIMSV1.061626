// src/components/SprintOverview.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SprintOverview = ({ selectedProject }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject) fetchTasks();
  }, [selectedProject]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('project_id', selectedProject.id);
      if (error) throw error;
      setTasks(data || []);
    } catch (error) { console.error("Error fetching tasks:", error.message); } 
    finally { setLoading(false); }
  };

  const totalTasks = tasks.length;
  const totalDone = tasks.filter(t => t.status === 'Done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const totalBlocked = tasks.filter(t => t.status === 'Blocked').length;
  const notStarted = tasks.filter(t => t.status === 'To Do').length;
  const overallPercent = totalTasks === 0 ? 0 : Math.round((totalDone / totalTasks) * 100);

  const totalStoryPts = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const ptsCompleted = tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.story_points || 0), 0);
  const ptsRemaining = totalStoryPts - ptsCompleted;

  const sprintsSummary = tasks.reduce((acc, task) => {
    const sprintName = task.sprint || 'Unassigned';
    if (!acc[sprintName]) acc[sprintName] = { name: sprintName, total: 0, done: 0, blocked: 0, storyPts: 0, donePts: 0 };
    acc[sprintName].total += 1;
    acc[sprintName].storyPts += (task.story_points || 0);
    if (task.status === 'Done') { acc[sprintName].done += 1; acc[sprintName].donePts += (task.story_points || 0); }
    if (task.status === 'Blocked') acc[sprintName].blocked += 1;
    return acc;
  }, {});

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Overview...</div>;

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-card primary"><h4>Total Tasks</h4><p className="metric-value">{totalTasks}</p></div>
        <div className="metric-card done"><h4>Total Done</h4><p className="metric-value">{totalDone}</p></div>
        <div className="metric-card in-progress"><h4>In Progress</h4><p className="metric-value">{inProgress}</p></div>
        <div className="metric-card blocked"><h4>Total Blocked</h4><p className="metric-value">{totalBlocked}</p></div>
        <div className="metric-card done"><h4>Overall % Complete</h4><p className="metric-value">{overallPercent}%</p></div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card"><h4>Not Started</h4><p className="metric-value">{notStarted}</p></div>
        <div className="metric-card in-progress"><h4>Total Story Pts</h4><p className="metric-value">{totalStoryPts}</p></div>
        <div className="metric-card done"><h4>Pts Completed</h4><p className="metric-value">{ptsCompleted}</p></div>
        <div className="metric-card"><h4>Pts Remaining</h4><p className="metric-value">{ptsRemaining}</p></div>
        <div className="metric-card primary"><h4>Active Sprints</h4><p className="metric-value">{Object.keys(sprintsSummary).length}</p></div>
      </div>
      <div className="ios-card">
        <div className="table-responsive">
          <table className="ios-table">
            <thead>
              <tr>
                <th>Sprint</th><th style={{textAlign: 'center'}}>Total</th><th style={{textAlign: 'center'}}>Done</th>
                <th style={{textAlign: 'center'}}>% Done</th><th style={{textAlign: 'center'}}>Velocity</th>
                <th style={{textAlign: 'center'}}>Blocked</th><th style={{textAlign: 'center'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(sprintsSummary).map(sprint => (
                <tr key={sprint.name}>
                  <td style={{fontWeight: 500}}>{sprint.name}</td><td style={{textAlign: 'center'}}>{sprint.total}</td>
                  <td style={{textAlign: 'center'}}>{sprint.done}</td><td style={{textAlign: 'center'}}>{Math.round((sprint.done / (sprint.total || 1)) * 100)}%</td>
                  <td style={{textAlign: 'center'}}>{sprint.donePts}</td><td style={{textAlign: 'center', color: sprint.blocked > 0 ? '#ff3b30' : 'inherit'}}>{sprint.blocked}</td>
                  <td style={{textAlign: 'center'}}><span className="ios-badge status-in-progress">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default SprintOverview;