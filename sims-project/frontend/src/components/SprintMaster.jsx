import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './SprintTracker.css';

const SprintMaster = () => {
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Sprints and Phases Arrays
  const [sprints, setSprints] = useState(['[S1] Design and Requirements', '[S2] Adjustment and Onboarding']);
  const [phases, setPhases] = useState(['Initiation', '[P1] Prerequisites', 'Development', 'Testing']);
  const fibonacciPoints = [1, 2, 3, 5, 8, 13]; 
  
  const [editingRowId, setEditingRowId] = useState(null);
  
  // UI States
  const tableContainerRef = useRef(null);
  const [assigneePopover, setAssigneePopover] = useState(null); 
  const [deletePrompt, setDeletePrompt] = useState({ isOpen: false, taskId: null });
  const [floatingPrompt, setFloatingPrompt] = useState({ isOpen: false, type: '', taskId: null });
  const [promptValue, setPromptValue] = useState('');

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    sprint: '',
    taskName: '',
    assignees: [], // Updated to an array for multiple tags
    phase: '',
    points: '',
    priority: '',
    status: ''
  });

  // Draggable Filter Panel Logic
  const [filterPos, setFilterPos] = useState({ x: window.innerWidth - 350, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setFilterPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - filterPos.x,
      y: e.clientY - filterPos.y
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: devData } = await supabase.from('developers').select('*');
      if (devData) setDevelopers(devData.map(dev => dev.name));

      const { data: taskData } = await supabase.from('tasks').select('*').order('id', { ascending: true });
      if (taskData) {
        
        // Dynamically extract unique Sprints and Phases from the DB
        const uniqueSprints = [...new Set(taskData.map(t => t.sprint).filter(Boolean))];
        setSprints(prev => Array.from(new Set([...prev, ...uniqueSprints])));
        
        const uniquePhases = [...new Set(taskData.map(t => t.phase).filter(Boolean))];
        setPhases(prev => Array.from(new Set([...prev, ...uniquePhases])));

        setTasks(taskData.map(t => ({
          id: t.id,
          sprint: t.sprint || '',
          taskName: t.task_name || '',
          assignees: t.assignees || [],
          phase: t.phase || '',
          storyPoints: t.story_points || 1, 
          priority: t.priority || 'Medium',
          status: t.status || 'To Do',
          notes: t.notes || ''
        })));
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskChange = (id, field, value) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, [field]: value } : task));
  };

  // Filter Logic
  const handleFilterChange = (field, value) => setFilters({ ...filters, [field]: value });
  
  const toggleFilterAssignee = (devName) => {
    const newAssignees = filters.assignees.includes(devName)
      ? filters.assignees.filter(name => name !== devName)
      : [...filters.assignees, devName];
    setFilters({ ...filters, assignees: newAssignees });
  };

  const clearFilters = () => {
    setFilters({ sprint: '', taskName: '', assignees: [], phase: '', points: '', priority: '', status: '' });
  };

  const filteredTasks = tasks.filter(task => {
    if (editingRowId === task.id) return true; // Keep edited row visible
    if (filters.sprint && task.sprint !== filters.sprint) return false;
    if (filters.taskName && !task.taskName.toLowerCase().includes(filters.taskName.toLowerCase())) return false;
    if (filters.phase && task.phase !== filters.phase) return false;
    if (filters.points && task.storyPoints !== parseInt(filters.points)) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    
    // Assignee Multi-Tag Filter (Check if task has ANY of the selected filter assignees)
    if (filters.assignees.length > 0) {
      const hasMatch = filters.assignees.some(a => task.assignees.includes(a));
      if (!hasMatch) return false;
    }
    
    return true;
  });

  const handleAssigneeToggle = (id, devName, currentAssignees) => {
    const newAssignees = currentAssignees.includes(devName)
      ? currentAssignees.filter(name => name !== devName)
      : [...currentAssignees, devName];
    handleTaskChange(id, 'assignees', newAssignees);
  };

  const handleSprintSelectChange = (id, value) => {
    if (value === 'ADD_NEW_OPTION') {
      setPromptValue('');
      setFloatingPrompt({ isOpen: true, type: 'sprint', taskId: id });
    } else handleTaskChange(id, 'sprint', value);
  };

  const handlePhaseSelectChange = (id, value) => {
    if (value === 'ADD_NEW_OPTION') {
      setPromptValue('');
      setFloatingPrompt({ isOpen: true, type: 'phase', taskId: id });
    } else handleTaskChange(id, 'phase', value);
  };

  const submitFloatingPrompt = () => {
    if (!promptValue.trim()) return; 
    if (floatingPrompt.type === 'sprint') {
      setSprints(prev => [...prev, promptValue]);
      handleTaskChange(floatingPrompt.taskId, 'sprint', promptValue);
    } else if (floatingPrompt.type === 'phase') {
      setPhases(prev => [...prev, promptValue]);
      handleTaskChange(floatingPrompt.taskId, 'phase', promptValue);
    }
    setFloatingPrompt({ isOpen: false, type: '', taskId: null });
  };

  const addNewTaskRow = async () => {
    const newTaskData = { sprint: sprints[0] || '', task_name: '', assignees: [], phase: phases[0] || '', story_points: 1, priority: 'Medium', status: 'To Do', notes: '' };
    try {
      const { data, error } = await supabase.from('tasks').insert([newTaskData]).select(); 
      if (error) throw error;
      if (data && data.length > 0) {
        const newDbTask = data[0];
        const formattedTask = { 
          id: newDbTask.id, sprint: newDbTask.sprint || '', taskName: newDbTask.task_name || '', assignees: newDbTask.assignees || [], phase: newDbTask.phase || '', storyPoints: newDbTask.story_points || 1, priority: newDbTask.priority || 'Medium', status: newDbTask.status || 'To Do', notes: newDbTask.notes || '' 
        };
        setTasks([...tasks, formattedTask]);
        setEditingRowId(formattedTask.id);
        
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
          }
        }, 100);
      }
    } catch (error) { console.error("Error adding:", error.message); }
  };

  const confirmDeleteTask = async () => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', deletePrompt.taskId);
      if (error) throw error;
      setTasks(tasks.filter(task => task.id !== deletePrompt.taskId));
      if (editingRowId === deletePrompt.taskId) setEditingRowId(null);
      setDeletePrompt({ isOpen: false, taskId: null });
    } catch (error) { console.error("Error deleting:", error.message); }
  };

  const toggleEditRow = async (id) => {
    if (editingRowId === id) {
      const taskToUpdate = tasks.find(t => t.id === id);
      if (!taskToUpdate.sprint || !taskToUpdate.taskName.trim() || !taskToUpdate.phase || !taskToUpdate.priority || !taskToUpdate.status) {
        alert("Cannot save: Please fill out all required fields (Sprint, Task Name, Phase, Priority, Status).");
        return; 
      }
      try {
        const { error } = await supabase.from('tasks').update({ sprint: taskToUpdate.sprint, task_name: taskToUpdate.taskName, assignees: taskToUpdate.assignees, phase: taskToUpdate.phase, story_points: taskToUpdate.storyPoints, priority: taskToUpdate.priority, status: taskToUpdate.status, notes: taskToUpdate.notes }).eq('id', id);
        if (error) throw error;
        setEditingRowId(null); 
      } catch (error) { console.error("Error updating:", error.message); }
    } else {
      setEditingRowId(id); 
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#8e8e93' }}>Loading Data...</div>;

  const activeFilterCount = (Object.values(filters).filter(v => typeof v === 'string' ? v !== '' : v.length > 0)).length;

  return (
    <div className="sprint-tracker-view">
      
      {floatingPrompt.isOpen && (
        <div className="floating-prompt-panel ios-card">
          <h4>Add New {floatingPrompt.type === 'sprint' ? 'Sprint' : 'Phase'}</h4>
          <input type="text" autoFocus className="ios-table-input" placeholder={`Enter ${floatingPrompt.type} name...`} value={promptValue} onChange={(e) => setPromptValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitFloatingPrompt()} />
          <div className="floating-prompt-actions">
            <button className="ios-button-secondary" onClick={() => setFloatingPrompt({ isOpen: false, type: '', taskId: null })}>Cancel</button>
            <button className="btn-gradient" onClick={submitFloatingPrompt}>Add</button>
          </div>
        </div>
      )}

      {deletePrompt.isOpen && (
        <div className="floating-prompt-panel ios-card" style={{ borderTop: '4px solid #ff3b30' }}>
          <h4>Delete Task</h4>
          <p style={{ fontSize: '0.85rem', color: '#666', textAlign: 'center', marginBottom: '16px' }}>Are you sure? This action cannot be undone.</p>
          <div className="floating-prompt-actions">
            <button className="ios-button-secondary" onClick={() => setDeletePrompt({ isOpen: false, taskId: null })}>Cancel</button>
            <button className="ios-button" style={{ background: '#ff3b30', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '12px' }} onClick={confirmDeleteTask}>Delete</button>
          </div>
        </div>
      )}

      <div className="tracker-header-row">
        <h2 className="tracker-title">Sprint Master</h2>
        
        <div className="tracker-actions-wrapper">
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="ios-button-secondary">
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <button onClick={addNewTaskRow} className="btn-gradient">+ Add Task</button>

          {/* Draggable Floating Filter Panel */}
          {isFilterOpen && (
            <div className="filter-panel" style={{ left: filterPos.x, top: filterPos.y }}>
              <div className="filter-header" onMouseDown={handleDragStart}>
                <h4>Filter Tasks</h4>
                {activeFilterCount > 0 && (
                  <button className="filter-clear-btn" onMouseDown={(e) => { e.stopPropagation(); clearFilters(); }}>Clear All</button>
                )}
              </div>
              
              <div className="filter-body">
                <div className="filter-group">
                  <label>Task Name</label>
                  <input type="text" className="ios-table-input" placeholder="Search text..." value={filters.taskName} onChange={(e) => handleFilterChange('taskName', e.target.value)} />
                </div>
                
                <div className="filter-group">
                  <label>Sprint</label>
                  <select className="ios-table-select" value={filters.sprint} onChange={(e) => handleFilterChange('sprint', e.target.value)}>
                    <option value="">All Sprints</option>
                    {sprints.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Phase</label>
                  <select className="ios-table-select" value={filters.phase} onChange={(e) => handleFilterChange('phase', e.target.value)}>
                    <option value="">All Phases</option>
                    {phases.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Assignee(s)</label>
                  <div className="assignee-tags-container">
                    {developers.map(dev => (
                      <span 
                        key={dev} 
                        className={`assignee-tag ${filters.assignees.includes(dev) ? 'selected' : ''}`}
                        onClick={() => toggleFilterAssignee(dev)}
                      >
                        {dev}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="filter-group">
                    <label>Points</label>
                    <select className="ios-table-select" value={filters.points} onChange={(e) => handleFilterChange('points', e.target.value)}>
                      <option value="">All</option>
                      {fibonacciPoints.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Priority</label>
                    <select className="ios-table-select" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                      <option value="">All</option>
                      <option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="filter-group">
                  <label>Status</label>
                  <select className="ios-table-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                    <option value="">All</option>
                    <option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Blocked">Blocked</option><option value="Done">Done</option>
                  </select>
                </div>

                <button className="ios-button-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setIsFilterOpen(false)}>Close Filters</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ios-card tracker-card scrollable-table-container" ref={tableContainerRef}>
        <table className="ios-table tracker-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th style={{ width: '220px' }}>Sprint</th>
              <th>Task Name</th>
              <th style={{ width: '200px' }}>Assignee(s)</th>
              <th style={{ width: '150px' }}>Phase</th>
              <th style={{ width: '90px', textAlign: 'center', paddingRight: '20px' }}>Points</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Priority</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
              <th>Notes</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
               <tr><td colSpan="10" style={{textAlign: 'center', padding: '2rem', color: '#8e8e93'}}>No tasks match the current filters.</td></tr>
            ) : (
              filteredTasks.map((task, index) => {
                const isEditing = editingRowId === task.id;
                return (
                  <tr key={task.id} className={isEditing ? "row-editing" : ""}>
                    <td style={{ textAlign: 'center', fontWeight: '500', color: '#8e8e93' }}>{index + 1}</td>
                    
                    <td>
                      {isEditing ? (
                        <select value={task.sprint} onChange={(e) => handleSprintSelectChange(task.id, e.target.value)} className="ios-table-select">
                          <option value="" disabled>Select Sprint</option>
                          {sprints.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="ADD_NEW_OPTION" className="add-new-option-item">+ Add New Sprint...</option>
                        </select>
                      ) : ( <span className="static-cell-text">{task.sprint}</span> )}
                    </td>

                    <td>
                      {isEditing ? (
                        <textarea rows={1} placeholder="Required" value={task.taskName} onChange={(e) => handleTaskChange(task.id, 'taskName', e.target.value)} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }} className={`ios-table-textarea ${!task.taskName ? 'input-error' : ''}`} />
                      ) : ( <span className="static-cell-text font-semibold">{task.taskName || '—'}</span> )}
                    </td>

                    <td style={{ position: 'relative' }}>
                      {isEditing ? (
                        <div className="assignee-tags-container">
                          {developers.map(dev => (
                            <span key={dev} className={`assignee-tag ${task.assignees.includes(dev) ? 'selected' : ''}`} onClick={() => handleAssigneeToggle(task.id, dev, task.assignees)}>
                              {dev}
                            </span>
                          ))}
                        </div>
                      ) : ( 
                        <div className="assignee-tags-container">
                          {task.assignees.length === 0 && <span style={{color: '#8e8e93', fontSize: '0.85rem'}}>Unassigned</span>}
                          {task.assignees.slice(0, 2).map(dev => <span key={dev} className="assignee-tag view-only">{dev}</span>)}
                          {task.assignees.length > 2 && (
                            <span className="assignee-tag view-only more-tag" onClick={(e) => { e.stopPropagation(); setAssigneePopover(assigneePopover === task.id ? null : task.id); }}>
                              ...
                            </span>
                          )}
                          {assigneePopover === task.id && (
                            <div className="assignee-popover">
                              <div className="popover-header">
                                <span>All Assignees</span>
                                <button onClick={() => setAssigneePopover(null)}>×</button>
                              </div>
                              <div className="assignee-tags-container">
                                {task.assignees.map(dev => <span key={dev} className="assignee-tag view-only">{dev}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <select value={task.phase} onChange={(e) => handlePhaseSelectChange(task.id, e.target.value)} className="ios-table-select">
                          <option value="" disabled>Select Phase</option>
                          {phases.map(p => <option key={p} value={p}>{p}</option>)}
                          <option value="ADD_NEW_OPTION" className="add-new-option-item">+ Add New Phase...</option>
                        </select>
                      ) : ( <span className="static-cell-text">{task.phase}</span> )}
                    </td>

                    <td style={{ textAlign: 'center', paddingRight: '20px' }}>
                      {isEditing ? (
                        <select value={task.storyPoints} onChange={(e) => handleTaskChange(task.id, 'storyPoints', parseInt(e.target.value))} className="ios-table-select" style={{textAlign: 'center'}}>
                          {fibonacciPoints.map(pts => <option key={pts} value={pts}>{pts}</option>)}
                        </select>
                      ) : ( <span className="static-cell-text badge-count">{task.storyPoints}</span> )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <select value={task.priority} onChange={(e) => handleTaskChange(task.id, 'priority', e.target.value)} className="ios-table-select">
                          <option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                        </select>
                      ) : ( <span className={`ios-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span> )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <select value={task.status} onChange={(e) => handleTaskChange(task.id, 'status', e.target.value)} className="ios-table-select">
                          <option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Blocked">Blocked</option><option value="Done">Done</option>
                        </select>
                      ) : ( <span className={`ios-badge status-${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span> )}
                    </td>

                    <td>
                      {isEditing ? (
                        <textarea rows={1} placeholder="Optional" value={task.notes} onChange={(e) => handleTaskChange(task.id, 'notes', e.target.value)} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }} className="ios-table-textarea" />
                      ) : ( <span className="static-cell-text notes-text">{task.notes || '—'}</span> )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className="action-button-group">
                        <button onClick={() => toggleEditRow(task.id)} className={`action-btn ${isEditing ? 'btn-save' : 'btn-edit'}`}>
                          {isEditing ? 'Save' : 'Edit'}
                        </button>
                        <button onClick={() => triggerDeleteTask(task.id)} className="action-btn btn-delete">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SprintMaster;