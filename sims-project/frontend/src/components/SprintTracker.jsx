import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Import your new connection file
import './SprintTracker.css';

const SprintTracker = () => {
  // 1. Core Component States (Now starting empty!)
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true); // Added a loading state

  // Sprints and phases remain local state for now, but you could move these to the DB later!
  const [sprints, setSprints] = useState(['[S1] Design and Requirements', '[S2] Adjustment and Onboarding']);
  const [phases, setPhases] = useState(['Initiation', '[P1] Prerequisites', 'Development', 'Testing']);
  
  const [editingRowId, setEditingRowId] = useState(null);

  // 2. Fetch Data on Mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // --- Fetch Developers ---
      const { data: devData, error: devError } = await supabase
        .from('developers')
        .select('*');

      if (devError) throw devError;
      
      // We only need the names for the dropdown, so we map the array
      if (devData) {
        setDevelopers(devData.map(dev => dev.name));
      }

      // --- Fetch Tasks ---
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: true }); // Keep them in order

      if (taskError) throw taskError;

      // Map Supabase snake_case columns back to your React camelCase state format
      if (taskData) {
        const formattedTasks = taskData.map(t => ({
          id: t.id,
          sprint: t.sprint || '',
          taskName: t.task_name || '', // Mapping database 'task_name' to React 'taskName'
          assignees: t.assignees || [],
          phase: t.phase || '',
          storyPoints: t.story_points || 0, // Mapping 'story_points' to 'storyPoints'
          priority: t.priority || 'Medium',
          status: t.status || 'To Do',
          notes: t.notes || ''
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };
  // 2. Core State Management Functions
  const handleTaskChange = (id, field, value) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    );
    setTasks(updatedTasks);
  };

  // Intercepts the Sprint dropdown selection
  const handleSprintSelectChange = (id, value) => {
    if (value === 'ADD_NEW_OPTION') {
      const newSprintName = prompt('Enter new sprint name:');
      if (newSprintName && newSprintName.trim() !== '') {
        setSprints([...sprints, newSprintName]);
        handleTaskChange(id, 'sprint', newSprintName);
      }
    } else {
      handleTaskChange(id, 'sprint', value);
    }
  };

  // Intercepts the Phase dropdown selection
  const handlePhaseSelectChange = (id, value) => {
    if (value === 'ADD_NEW_OPTION') {
      const newPhaseName = prompt('Enter new phase name:');
      if (newPhaseName && newPhaseName.trim() !== '') {
        setPhases([...phases, newPhaseName]);
        handleTaskChange(id, 'phase', newPhaseName);
      }
    } else {
      handleTaskChange(id, 'phase', value);
    }
  };

  const handleAssigneeChange = (id, options) => {
    const selectedDevs = Array.from(options).filter(option => option.selected).map(option => option.value);
    handleTaskChange(id, 'assignees', selectedDevs);
  };

  // 3. Row Actions: Add, Delete, Toggle Edit
  // 3. Row Actions: Add, Delete, Toggle Edit
  const addNewTaskRow = async () => {
    // 1. Prepare the data using the snake_case format your database expects
    const newTaskData = {
      sprint: sprints[0] || '',
      task_name: '',
      assignees: [],
      phase: phases[0] || '',
      story_points: 0,
      priority: 'Medium',
      status: 'To Do',
      notes: ''
    };

    try {
      // 2. Insert into Supabase AND ask it to return the new row data (.select)
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTaskData])
        .select(); 

      if (error) throw error;

      // 3. Map the real database ID and format back to the React UI
      if (data && data.length > 0) {
        const newDbTask = data[0];
        const formattedTask = {
          id: newDbTask.id,
          sprint: newDbTask.sprint || '',
          taskName: newDbTask.task_name || '',
          assignees: newDbTask.assignees || [],
          phase: newDbTask.phase || '',
          storyPoints: newDbTask.story_points || 0,
          priority: newDbTask.priority || 'Medium',
          status: newDbTask.status || 'To Do',
          notes: newDbTask.notes || ''
        };

        setTasks([...tasks, formattedTask]);
        setEditingRowId(formattedTask.id); // Automatically open in edit mode
      }
    } catch (error) {
      console.error("Error adding task:", error.message);
      alert("Failed to add task to the database.");
    }
  };

  const deleteTaskRow = async (id) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        // 1. Delete from Supabase first
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // 2. Only remove it from the UI if the database deletion was successful
        setTasks(tasks.filter(task => task.id !== id));
        if (editingRowId === id) setEditingRowId(null);

      } catch (error) {
        console.error("Error deleting task:", error.message);
        alert("Failed to delete from the database.");
      }
    }
  };

  const toggleEditRow = async (id) => {
    if (editingRowId === id) {
      // SAVE MODE: The user clicked "Save", so we push the current state to the DB
      const taskToUpdate = tasks.find(t => t.id === id);

      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            sprint: taskToUpdate.sprint,
            task_name: taskToUpdate.taskName,
            assignees: taskToUpdate.assignees,
            phase: taskToUpdate.phase,
            story_points: taskToUpdate.storyPoints,
            priority: taskToUpdate.priority,
            status: taskToUpdate.status,
            notes: taskToUpdate.notes
          })
          .eq('id', id);

        if (error) throw error;
        
        setEditingRowId(null); // Close edit mode on success
      } catch (error) {
        console.error("Error updating task:", error.message);
        alert("Failed to save changes to the database.");
      }
    } else {
      // OPEN MODE: The user just clicked "Edit", no database action needed yet
      setEditingRowId(id); 
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#8e8e93' }}>Loading Sprint Tracker...</div>;
  }

  return (
    <div className="sprint-tracker-view">
      <div className="tracker-header-row">
        <h2 className="tracker-title">Sprint Master — Task Register</h2>
        <button onClick={addNewTaskRow} className="ios-button">+ Add Task</button>
      </div>

      <div className="ios-card tracker-card">
        <div className="table-responsive">
          <table className="ios-table tracker-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ width: '220px' }}>Sprint</th>
                <th>Task Name</th>
                <th style={{ width: '160px' }}>Assignee(s)</th>
                <th style={{ width: '150px' }}>Phase</th>
                <th style={{ width: '90px' }}>Story Points</th>
                <th style={{ width: '120px' }}>Priority</th>
                <th style={{ width: '130px' }}>Status</th>
                <th>Notes</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => {
                const isEditing = editingRowId === task.id;
                return (
                  <tr key={task.id} className={isEditing ? "row-editing" : ""}>
                    <td style={{ textAlign: 'center', fontWeight: '500', color: '#8e8e93' }}>{index + 1}</td>
                    
                    {/* Sprint Column */}
                    <td>
                      {isEditing ? (
                        <select 
                          value={task.sprint} 
                          onChange={(e) => handleSprintSelectChange(task.id, e.target.value)}
                          className="ios-table-select"
                        >
                          {sprints.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="ADD_NEW_OPTION" className="add-new-option-item">+ Add New Sprint...</option>
                        </select>
                      ) : (
                        <span className="static-cell-text">{task.sprint}</span>
                      )}
                    </td>

                    {/* Task Name Column */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={task.taskName} 
                          onChange={(e) => handleTaskChange(task.id, 'taskName', e.target.value)} 
                          className="ios-table-input"
                        />
                      ) : (
                        <span className="static-cell-text font-semibold">{task.taskName || '—'}</span>
                      )}
                    </td>

                    {/* Assignees Column */}
                    <td>
                      {isEditing ? (
                        <>
                          <select 
                            multiple 
                            value={task.assignees} 
                            onChange={(e) => handleAssigneeChange(task.id, e.target.options)}
                            className="ios-table-select ios-table-select-multiple"
                          >
                            {developers.map(dev => <option key={dev} value={dev}>{dev}</option>)}
                          </select>
                          <span className="ios-helper-text">Ctrl/Cmd + Click</span>
                        </>
                      ) : (
                        <span className="static-cell-text">
                          {task.assignees.length > 0 ? task.assignees.join(', ') : 'Unassigned'}
                        </span>
                      )}
                    </td>

                    {/* Phase Column */}
                    <td>
                      {isEditing ? (
                        <select 
                          value={task.phase} 
                          onChange={(e) => handlePhaseSelectChange(task.id, e.target.value)}
                          className="ios-table-select"
                        >
                          {phases.map(p => <option key={p} value={p}>{p}</option>)}
                          <option value="ADD_NEW_OPTION" className="add-new-option-item">+ Add New Phase...</option>
                        </select>
                      ) : (
                        <span className="static-cell-text">{task.phase}</span>
                      )}
                    </td>

                    {/* Story Points Column */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={task.storyPoints} 
                          onChange={(e) => handleTaskChange(task.id, 'storyPoints', parseInt(e.target.value) || 0)} 
                          className="ios-table-input"
                          style={{ textAlign: 'center' }}
                        />
                      ) : (
                        <span className="static-cell-text badge-count">{task.storyPoints}</span>
                      )}
                    </td>

                    {/* Priority Column */}
                    <td>
                      {isEditing ? (
                        <select 
                          value={task.priority} 
                          onChange={(e) => handleTaskChange(task.id, 'priority', e.target.value)}
                          className="ios-table-select"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      ) : (
                        <span className={`ios-badge priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td>
                      {isEditing ? (
                        <select 
                          value={task.status} 
                          onChange={(e) => handleTaskChange(task.id, 'status', e.target.value)}
                          className="ios-table-select"
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Blocked">Blocked</option>
                          <option value="Done">Done</option>
                        </select>
                      ) : (
                        <span className={`ios-badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
                          {task.status}
                        </span>
                      )}
                    </td>

                    {/* Notes Column */}
                    <td>
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={task.notes} 
                          onChange={(e) => handleTaskChange(task.id, 'notes', e.target.value)} 
                          className="ios-table-input"
                        />
                      ) : (
                        <span className="static-cell-text notes-text">{task.notes || '—'}</span>
                      )}
                    </td>

                    {/* Action Buttons Column */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-button-group">
                        <button 
                          onClick={() => toggleEditRow(task.id)} 
                          className={`action-btn ${isEditing ? 'btn-save' : 'btn-edit'}`}
                        >
                          {isEditing ? 'Save' : 'Edit'}
                        </button>
                        <button 
                          onClick={() => deleteTaskRow(task.id)} 
                          className="action-btn btn-delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
};

export default SprintTracker;