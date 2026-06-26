import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useModal } from './ModalProvider';
import './SprintTracker.css';

const SprintMaster = ({ selectedProject, phases, fetchPhases }) => {
  const { showAlert, showConfirm } = useModal();
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sprints, setSprints] = useState(['[S1] Design and Requirements', '[S2] Adjustment and Onboarding']);
  const fibonacciPoints = [1, 2, 3, 5, 8, 13]; 
  
  const [editingRowId, setEditingRowId] = useState(null);
  const [originalTaskData, setOriginalTaskData] = useState(null); 
  
  const tableContainerRef = useRef(null);
  const [assigneePopover, setAssigneePopover] = useState(null); 
  const [floatingPrompt, setFloatingPrompt] = useState({ isOpen: false, type: '', taskId: null });
  const [promptValue, setPromptValue] = useState('');
  
  const [isPhaseManagerOpen, setIsPhaseManagerOpen] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ sprint: '', taskName: '', assignees: [], phase: '', points: '', priority: '', status: '' });
  const [filterPos, setFilterPos] = useState({ x: window.innerWidth - 350, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setFilterPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }
  }, [isDragging]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - filterPos.x, y: e.clientY - filterPos.y };
  };

  useEffect(() => { if (selectedProject) fetchData(); }, [selectedProject]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: devData } = await supabase.from('developers').select('*');
      if (devData) setDevelopers(devData.map(dev => dev.name));

      // ONLY fetch from `tasks` table
      const { data: taskData } = await supabase.from('tasks').select('*').eq('project_id', selectedProject.id).order('id', { ascending: true });
      if (taskData) {
        const uniqueSprints = [...new Set(taskData.map(t => t.sprint).filter(Boolean))];
        setSprints(prev => Array.from(new Set([...prev, ...uniqueSprints])));

        setTasks(taskData.map(t => ({
          id: t.id, sprint: t.sprint || '', taskName: t.task_name || '', assignees: t.assignees || [], 
          phase: t.phase || '', storyPoints: t.story_points || 1, priority: t.priority || 'Medium', 
          status: t.status || 'To Do', notes: t.notes || ''
        })));
      }
    } catch (error) { console.error("Error fetching data:", error.message); } 
    finally { setLoading(false); }
  };

  const handleTaskChange = (id, field, value) => setTasks(tasks.map(task => task.id === id ? { ...task, [field]: value } : task));
  const handleFilterChange = (field, value) => setFilters({ ...filters, [field]: value });
  
  const toggleFilterAssignee = (devName) => {
    const newAssignees = filters.assignees.includes(devName) ? filters.assignees.filter(name => name !== devName) : [...filters.assignees, devName];
    setFilters({ ...filters, assignees: newAssignees });
  };

  const clearFilters = () => setFilters({ sprint: '', taskName: '', assignees: [], phase: '', points: '', priority: '', status: '' });

  const filteredTasks = tasks.filter(task => {
    if (editingRowId === task.id) return true; 
    if (filters.sprint && task.sprint !== filters.sprint) return false;
    if (filters.taskName && !task.taskName.toLowerCase().includes(filters.taskName.toLowerCase())) return false;
    if (filters.phase && task.phase !== filters.phase) return false;
    if (filters.points && task.storyPoints !== parseInt(filters.points)) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.assignees.length > 0 && !filters.assignees.some(a => task.assignees.includes(a))) return false;
    return true;
  });

  const handleAssigneeToggle = (id, devName, currentAssignees) => {
    const newAssignees = currentAssignees.includes(devName) ? currentAssignees.filter(name => name !== devName) : [...currentAssignees, devName];
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

  const submitFloatingPrompt = async () => {
    if (!promptValue.trim()) return; 
    if (floatingPrompt.type === 'sprint') {
      setSprints(prev => [...prev, promptValue]);
      handleTaskChange(floatingPrompt.taskId, 'sprint', promptValue);
    } else if (floatingPrompt.type === 'phase') {
      try {
        const { data, error } = await supabase.from('phases').insert([{ project_id: selectedProject.id, name: promptValue }]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          await fetchPhases();
          handleTaskChange(floatingPrompt.taskId, 'phase', data[0].name);
        }
      } catch (err) { showAlert(`Error creating phase: ${err.message}`); }
    }
    setFloatingPrompt({ isOpen: false, type: '', taskId: null });
  };

  const handleDeletePhase = async (phaseId) => {
    const confirmed = await showConfirm("Delete this phase? Tasks using it might lose their phase mapping.");
    if (confirmed) {
      try {
        await supabase.from('phases').delete().eq('id', phaseId);
        await fetchPhases();
      } catch (err) { showAlert(`Error deleting phase: ${err.message}`); }
    }
  };

  const addNewTaskRow = () => {
    const tempId = `temp_${Date.now()}`;
    const newTaskData = { 
      id: tempId, isNew: true, sprint: sprints[0] || '', taskName: '', assignees: [], 
      phase: phases && phases.length > 0 ? phases[0].name : '', storyPoints: 1, priority: 'Medium', status: 'To Do', notes: '' 
    };
    setTasks([...tasks, newTaskData]);
    setEditingRowId(tempId);
    setOriginalTaskData(null);
    setTimeout(() => {
      if (tableContainerRef.current) tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const startEditingRow = (task) => {
    setOriginalTaskData({ ...task });
    setEditingRowId(task.id);
  };

  const cancelEditingRow = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task.isNew) setTasks(tasks.filter(t => t.id !== id));
    else setTasks(tasks.map(t => t.id === id ? originalTaskData : t));
    
    setEditingRowId(null);
    setOriginalTaskData(null);
  };

  const saveRow = async (id) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate.sprint || !taskToUpdate.taskName.trim() || !taskToUpdate.phase || !taskToUpdate.priority || !taskToUpdate.status) {
      setAlertModal({ isOpen: true, title: 'Missing Required Fields', message: 'Please fill out all required fields: Sprint, Task Name, Phase, Priority, and Status.' });
      return; 
    }

    const dbPayload = { 
      project_id: selectedProject.id,
      sprint: taskToUpdate.sprint, task_name: taskToUpdate.taskName, assignees: taskToUpdate.assignees, 
      phase: taskToUpdate.phase, story_points: taskToUpdate.storyPoints, priority: taskToUpdate.priority, 
      status: taskToUpdate.status, notes: taskToUpdate.notes 
    };

    try {
      if (taskToUpdate.isNew) {
        const { data, error } = await supabase.from('tasks').insert([dbPayload]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          const newDbTask = data[0];
          setTasks(tasks.map(t => t.id === id ? { 
            id: newDbTask.id, sprint: newDbTask.sprint || '', taskName: newDbTask.task_name || '', 
            assignees: newDbTask.assignees || [], phase: newDbTask.phase || '', storyPoints: newDbTask.story_points || 1, 
            priority: newDbTask.priority || 'Medium', status: newDbTask.status || 'To Do', notes: newDbTask.notes || '' 
          } : t));
        }
      } else {
        const { error } = await supabase.from('tasks').update(dbPayload).eq('id', id);
        if (error) throw error;
      }
      setEditingRowId(null); 
      setOriginalTaskData(null);
    } catch (error) { 
      console.error("Error updating:", error.message); 
      showAlert(`Database Error: ${error.message}`);
    }
  };

  const confirmDeleteTask = async (taskId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this task? This action cannot be undone.');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.filter(task => task.id !== taskId));
      if (editingRowId === taskId) setEditingRowId(null);
    } catch (error) { 
      console.error("Error deleting:", error.message); 
      showAlert(`Error Deleting Task: ${error.message}`);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#8e8e93' }}>Loading Data...</div>;
  const activeFilterCount = (Object.values(filters).filter(v => typeof v === 'string' ? v !== '' : v.length > 0)).length;

  return (
    <div className="sprint-tracker-view">
      
      {/* MANAGE PHASES MODAL */}
      {isPhaseManagerOpen && (
        <div style={overlayStyle}>
          <div className="alert-modal-card" style={{ width: '400px', background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h4 style={{ color: '#1c1c1e', margin: '0 0 16px 0', fontSize: '1.2rem', textAlign: 'center' }}>Manage Phases</h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto', textAlign: 'left', marginBottom: '16px' }}>
              {(!phases || phases.length === 0) && <p style={{color: '#8e8e93', textAlign: 'center'}}>No phases yet.</p>}
              {phases && phases.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 8px', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: '0.9rem', color: '#1c1c1e' }}>{p.name}</span>
                  <button onClick={() => handleDeletePhase(p.id)} style={{ color: '#ff3b30', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕ Delete</button>
                </div>
              ))}
            </div>
            <button style={{width: '100%', background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'}} onClick={() => setIsPhaseManagerOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ADD PHASE PROMPT */}
      {floatingPrompt.isOpen && (
        <div style={overlayStyle}>
          <div style={{ width: '320px', padding: '24px', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', textAlign: 'center', color: '#1c1c1e' }}>Add New {floatingPrompt.type === 'sprint' ? 'Sprint' : 'Phase'}</h4>
            <input type="text" autoFocus className="ios-table-input" placeholder={`Enter ${floatingPrompt.type} name...`} value={promptValue} onChange={(e) => setPromptValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitFloatingPrompt()} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button style={{ flex: '1 1 0', padding: '12px', background: '#e5e5ea', color: '#1c1c1e', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', boxSizing: 'border-box' }} onClick={() => setFloatingPrompt({ isOpen: false, type: '', taskId: null })}>Cancel</button>
              <button style={{ flex: '1 1 0', padding: '12px', background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', boxSizing: 'border-box' }} onClick={submitFloatingPrompt}>Add</button>
            </div>
          </div>
        </div>
      )}

      <div className="tracker-header-row">
        <h2 className="tracker-title">Sprint Master</h2>
        <div className="tracker-actions-wrapper">
          <button onClick={() => setIsPhaseManagerOpen(true)} className="ios-button-secondary">Manage Phases</button>
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="ios-button-secondary">Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</button>
          <button onClick={addNewTaskRow} className="btn-gradient">+ Add Task</button>

          {isFilterOpen && (
            <div className="filter-panel" style={{ left: filterPos.x, top: filterPos.y }}>
              <div className="filter-header" onMouseDown={handleDragStart}>
                <h4>Filter Tasks</h4>
                {activeFilterCount > 0 && <button className="filter-clear-btn" onMouseDown={(e) => { e.stopPropagation(); clearFilters(); }}>Clear All</button>}
              </div>
              <div className="filter-body">
                <div className="filter-group"><label>Task Name</label><input type="text" className="ios-table-input" placeholder="Search text..." value={filters.taskName} onChange={(e) => handleFilterChange('taskName', e.target.value)} /></div>
                <div className="filter-group"><label>Sprint</label><select className="ios-table-select" value={filters.sprint} onChange={(e) => handleFilterChange('sprint', e.target.value)}><option value="">All Sprints</option>{sprints.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="filter-group"><label>Phase</label><select className="ios-table-select" value={filters.phase} onChange={(e) => handleFilterChange('phase', e.target.value)}><option value="">All Phases</option>{phases && phases.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                <div className="filter-group"><label>Assignee(s)</label><div className="assignee-tags-container">{developers.map(dev => <span key={dev} className={`assignee-tag ${filters.assignees.includes(dev) ? 'selected' : ''}`} onClick={() => toggleFilterAssignee(dev)}>{dev}</span>)}</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="filter-group"><label>Points</label><select className="ios-table-select" value={filters.points} onChange={(e) => handleFilterChange('points', e.target.value)}><option value="">All</option>{fibonacciPoints.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  <div className="filter-group"><label>Priority</label><select className="ios-table-select" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}><option value="">All</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
                </div>
                <div className="filter-group"><label>Status</label><select className="ios-table-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}><option value="">All</option><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Blocked">Blocked</option><option value="Done">Done</option></select></div>
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
              <th style={{ width: '40px', textAlign: 'center' }}>#</th><th style={{ width: '220px' }}>Sprint</th><th>Task Name</th><th style={{ width: '200px' }}>Assignee(s)</th><th style={{ width: '150px' }}>Phase</th><th style={{ width: '90px', textAlign: 'center', paddingRight: '20px' }}>Points</th><th style={{ width: '110px', textAlign: 'center' }}>Priority</th><th style={{ width: '120px', textAlign: 'center' }}>Status</th><th>Notes</th><th style={{ width: '180px', minWidth: '180px', textAlign: 'center' }}>Actions</th>
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
                    <td>{isEditing ? <select value={task.sprint} onChange={(e) => handleSprintSelectChange(task.id, e.target.value)} className="ios-table-select"><option value="" disabled>Select Sprint</option>{sprints.map(s => <option key={s} value={s}>{s}</option>)}<option value="ADD_NEW_OPTION" className="add-new-option-item">+ Add New Sprint...</option></select> : <span className="static-cell-text">{task.sprint}</span>}</td>
                    <td>{isEditing ? <textarea rows={1} placeholder="Required" value={task.taskName} onChange={(e) => handleTaskChange(task.id, 'taskName', e.target.value)} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }} className={`ios-table-textarea ${!task.taskName ? 'input-error' : ''}`} /> : <span className="static-cell-text font-semibold">{task.taskName || '—'}</span>}</td>
                    <td style={{ position: 'relative' }}>
                      {isEditing ? (
                        <div className="assignee-tags-container">{developers.map(dev => <span key={dev} className={`assignee-tag ${task.assignees.includes(dev) ? 'selected' : ''}`} onClick={() => handleAssigneeToggle(task.id, dev, task.assignees)}>{dev}</span>)}</div>
                      ) : ( 
                        <div className="assignee-tags-container">
                          {task.assignees.length === 0 && <span style={{color: '#8e8e93', fontSize: '0.85rem'}}>Unassigned</span>}
                          {task.assignees.slice(0, 2).map(dev => <span key={dev} className="assignee-tag view-only">{dev}</span>)}
                          {task.assignees.length > 2 && <span className="assignee-tag view-only more-tag" onClick={(e) => { e.stopPropagation(); setAssigneePopover(assigneePopover === task.id ? null : task.id); }}>...</span>}
                          {assigneePopover === task.id && <div className="assignee-popover"><div className="popover-header"><span>All Assignees</span><button onClick={() => setAssigneePopover(null)}>×</button></div><div className="assignee-tags-container">{task.assignees.map(dev => <span key={dev} className="assignee-tag view-only">{dev}</span>)}</div></div>}
                        </div>
                      )}
                    </td>
                    <td>{isEditing ? <select value={task.phase} onChange={(e) => handlePhaseSelectChange(task.id, e.target.value)} className="ios-table-select"><option value="" disabled>Select Phase</option>{phases && phases.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}<option value="ADD_NEW_OPTION" className="add-new-option-item">+ Add New Phase...</option></select> : <span className="static-cell-text">{task.phase}</span>}</td>
                    <td style={{ textAlign: 'center', paddingRight: '20px' }}>{isEditing ? <select value={task.storyPoints} onChange={(e) => handleTaskChange(task.id, 'storyPoints', parseInt(e.target.value))} className="ios-table-select" style={{textAlign: 'center'}}>{fibonacciPoints.map(pts => <option key={pts} value={pts}>{pts}</option>)}</select> : <span className="static-cell-text badge-count">{task.storyPoints}</span>}</td>
                    <td style={{ textAlign: 'center' }}>{isEditing ? <select value={task.priority} onChange={(e) => handleTaskChange(task.id, 'priority', e.target.value)} className="ios-table-select"><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select> : <span className={`ios-badge priority-${(task.priority || 'Medium').toLowerCase()}`}>{task.priority}</span>}</td>
                    <td style={{ textAlign: 'center' }}>{isEditing ? <select value={task.status} onChange={(e) => handleTaskChange(task.id, 'status', e.target.value)} className="ios-table-select"><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Blocked">Blocked</option><option value="Done">Done</option></select> : <span className={`ios-badge status-${(task.status || 'To Do').toLowerCase().replace(' ', '-')}`}>{task.status}</span>}</td>
                    <td>{isEditing ? <textarea rows={1} placeholder="Optional" value={task.notes} onChange={(e) => handleTaskChange(task.id, 'notes', e.target.value)} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }} className="ios-table-textarea" /> : <span className="static-cell-text notes-text">{task.notes || '—'}</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-button-group">
                        {isEditing ? (
                           <>
                             <button onClick={() => saveRow(task.id)} className="action-btn btn-save">Save</button>
                             <button onClick={() => cancelEditingRow(task.id)} className="action-btn btn-cancel-edit">Cancel</button>
                           </>
                        ) : (
                           <>
                             <button onClick={() => startEditingRow(task)} className="action-btn btn-edit">Edit</button>
                             <button onClick={() => confirmDeleteTask(task.id)} className="action-btn btn-delete">Delete</button>
                           </>
                        )}
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
}

export default SprintMaster;