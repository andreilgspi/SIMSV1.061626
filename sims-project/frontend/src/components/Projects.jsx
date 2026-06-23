import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as db from '../services/database';
import './Projects.css';

function Projects({ projects, selectedProject, onSelectProject, fetchProjects }) {
  // --- Project States ---
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', start_date: '', end_date: '', team: [] });
  const [editingProject, setEditingProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState({});

  // --- Developer States ---
  const [developers, setDevelopers] = useState([]);
  const [newDeveloper, setNewDeveloper] = useState({ name: '', email: '', role: '', avatar: null });
  const [previewDeveloper, setPreviewDeveloper] = useState(null);
  const [isEditingDeveloper, setIsEditingDeveloper] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState(null);

  // --- Role & Floating Prompt States ---
  const [availableRoles, setAvailableRoles] = useState([
    'Project Manager', 'Frontend Developer', 'Backend Developer', 
    'Quality Assurance', 'Business Analyst', 'UI Designer', 'UX Designer'
  ]);
  const [floatingPrompt, setFloatingPrompt] = useState({ isOpen: false, type: '' });
  const [promptValue, setPromptValue] = useState('');

  // --- UI States ---
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('projects');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createType, setCreateType] = useState('project');
  const [showDropdown, setShowDropdown] = useState(false);

  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- Fetching Data ---
  const fetchDevelopers = async () => {
    try {
      const data = await db.fetchDevelopers();
      setDevelopers(data);
    } catch (error) { console.error('Error fetching developers:', error); }
  };

  const fetchAllProjectTasks = async () => {
    setLoading(true);
    try {
      const tasksData = {};
      for (const project of projects) {
        const data = await db.fetchTasksByProject(project.id);
        tasksData[project.id] = data;
      }
      setProjectTasks(tasksData);
    } catch (error) { console.error('Error fetching project tasks:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (projects.length > 0) fetchAllProjectTasks();
    fetchDevelopers();
  }, [projects]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) setShowCreateMenu(false);
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Calculations ---
  const calculateProjectStatus = (project) => {
    if (!project || !project.start_date || !project.end_date) return 'On Track';
    const today = new Date(), start = new Date(project.start_date), end = new Date(project.end_date);
    if (today > end) return 'Done';
    const tasks = projectTasks[project.id] || [];
    const hasOverdueTasks = tasks.some(t => t.status !== 'Complete' && t.status !== 'Done' && new Date(t.end_date) < today);
    if (hasOverdueTasks) return 'Behind';
    if (today < start) return 'On Track';
    const progress = ((today - start) / (end - start)) * 100;
    if (tasks.length === 0) return 'On Track';
    const completionRate = (tasks.filter(t => t.status === 'Complete' || t.status === 'Done').length / tasks.length) * 100;
    return (completionRate - progress < -15) ? 'Behind' : 'On Track';
  };

  const getDeveloperStats = (devName) => {
    let total = 0, completed = 0, inProgress = 0, overdue = 0;
    const today = new Date();
    Object.values(projectTasks).flat().forEach(task => {
      let isAssigned = false;
      if (Array.isArray(task.assignees) && task.assignees.includes(devName)) isAssigned = true;
      if (typeof task.owner === 'string' && task.owner.includes(devName)) isAssigned = true;
      if (isAssigned) {
        total++;
        if (task.status === 'Complete' || task.status === 'Done') completed++;
        else if (task.status === 'In Progress') inProgress++;
        if (task.status !== 'Complete' && task.status !== 'Done' && new Date(task.end_date) < today) overdue++;
      }
    });
    return { total, completed, inProgress, overdue };
  };

  const getStatusColor = (status) => ({ 'On Track': '#34c759', 'Behind': '#ff3b30', 'Done': '#5856d6' }[status] || '#8e8e93');
  const getProjectProgress = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    if (tasks.length === 0) return 0;
    return Math.round(tasks.reduce((sum, t) => sum + (t.percent_complete || 0), 0) / tasks.length);
  };
  
  const getTaskCounts = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    return {
      total: tasks.length,
      complete: tasks.filter(t => t.status === 'Complete' || t.status === 'Done').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      notStarted: tasks.filter(t => t.status === 'Not Started' || t.status === 'To Do').length
    };
  };
  
  const getOverdueCount = (projectId) => {
    const today = new Date();
    return (projectTasks[projectId] || []).filter(t => new Date(t.end_date) < today && t.status !== 'Complete' && t.status !== 'Done').length;
  };

  const getDevelopersForProject = (project) => {
    // Combine explicit team assignments and inferred task assignments
    const explicitTeam = project?.team || [];
    const ownerSet = new Set(explicitTeam);
    (projectTasks[project.id] || []).forEach(task => {
      if (Array.isArray(task.assignees)) task.assignees.forEach(o => ownerSet.add(o));
      else if (task.owner) task.owner.split(',').forEach(o => ownerSet.add(o.trim()));
    });
    return Array.from(ownerSet);
  };

  const getAvatarColor = (name) => {
    const colors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#ff2d55', '#30b0c0', '#af52de'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };
  
  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set';

  // --- Handlers ---
  const handleInputChange = (e) => setNewProject({ ...newProject, [e.target.name]: e.target.value });
  const handleEditInputChange = (e) => setEditingProject({ ...editingProject, [e.target.name]: e.target.value });
  const handleDeveloperInputChange = (e) => setNewDeveloper({ ...newDeveloper, [e.target.name]: e.target.value });
  const handleEditDeveloperInputChange = (e) => setEditingDeveloper({ ...editingDeveloper, [e.target.name]: e.target.value });

  // Developer Tag Toggles for Projects
  const toggleNewProjectDeveloper = (devName) => {
    const currentTeam = newProject.team || [];
    const newTeam = currentTeam.includes(devName) ? currentTeam.filter(n => n !== devName) : [...currentTeam, devName];
    setNewProject({ ...newProject, team: newTeam });
  };

  const toggleEditProjectDeveloper = (devName) => {
    const currentTeam = editingProject.team || [];
    const newTeam = currentTeam.includes(devName) ? currentTeam.filter(n => n !== devName) : [...currentTeam, devName];
    setEditingProject({ ...editingProject, team: newTeam });
  };

  // Role Dropdown Logic
  const handleRoleSelect = (e, target) => {
    const value = e.target.value;
    if (value === 'ADD_NEW_ROLE') {
      setPromptValue('');
      setFloatingPrompt({ isOpen: true, type: target });
    } else {
      if (target === 'new') setNewDeveloper({ ...newDeveloper, role: value });
      if (target === 'edit') setEditingDeveloper({ ...editingDeveloper, role: value });
    }
  };

  const submitCustomRole = () => {
    if (!promptValue.trim()) return;
    setAvailableRoles([...availableRoles, promptValue]);
    
    if (floatingPrompt.type === 'new') setNewDeveloper({ ...newDeveloper, role: promptValue });
    if (floatingPrompt.type === 'edit') setEditingDeveloper({ ...editingDeveloper, role: promptValue });
    
    setFloatingPrompt({ isOpen: false, type: '' });
  };

  // --- Actions ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const data = await db.createProject(newProject);
      await fetchProjects();
      setIsCreating(false);
      setShowCreateMenu(false);
      setNewProject({ name: '', description: '', start_date: '', end_date: '', team: [] });
      if (data) onSelectProject(data);
    } catch (error) { console.error(error); }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      await db.updateProject(editingProject.id, editingProject);
      await fetchProjects();
      setIsEditing(false);
      setShowDropdown(false);
      const updatedProject = await db.fetchProjects();
      const found = updatedProject.find(p => p.id === editingProject.id);
      if (found) {
        onSelectProject(found);
        setPreviewProject(found);
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Delete this project?')) {
      await db.deleteProject(id);
      await fetchProjects();
      setShowDropdown(false);
      onSelectProject(null);
    }
  };

  const handleAddDeveloper = async (e) => {
    e.preventDefault();
    try {
      await db.createDeveloper(newDeveloper);
      await fetchDevelopers();
      setIsCreating(false);
      setShowCreateMenu(false);
      setNewDeveloper({ name: '', email: '', role: '', avatar: null });
    } catch (error) { console.error(error); }
  };

  const handleUpdateDeveloper = async (e) => {
    e.preventDefault();
    try {
      await db.updateDeveloper(editingDeveloper.id, editingDeveloper);
      await fetchDevelopers();
      setIsEditingDeveloper(false);
      setShowDropdown(false);
      setPreviewDeveloper(editingDeveloper); 
    } catch (error) { console.error(error); }
  };

  const handleDeleteDeveloper = async (id) => {
    if (window.confirm('Are you sure you want to delete this developer?')) {
      try {
        await db.deleteDeveloper(id);
        await fetchDevelopers();
        setShowDropdown(false);
        setPreviewDeveloper(null);
      } catch (error) { console.error(error); }
    }
  };

  const displayProject = previewProject || selectedProject;
  const displayDeveloper = previewDeveloper;

  return (
    <>
      {/* Floating Prompt for Custom Roles (No background blur) */}
      {floatingPrompt.isOpen && (
        <div className="floating-prompt-panel ios-card">
          <h4>Add Custom Role</h4>
          <input 
            type="text" autoFocus className="ios-table-input" 
            placeholder="e.g. Scrum Master" value={promptValue} 
            onChange={(e) => setPromptValue(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && submitCustomRole()} 
          />
          <div className="floating-prompt-actions">
            <button className="ios-button-secondary" onClick={() => setFloatingPrompt({ isOpen: false, type: '' })}>Cancel</button>
            <button className="btn-save" style={{padding: '0.75rem 1.5rem', borderRadius: '12px'}} onClick={submitCustomRole}>Add</button>
          </div>
        </div>
      )}

      {/* GLOBAL HEADER */}
      <div className="projects-global-header">
        <div className="projects-header-top">
          <div className="projects-brand">IntelliTrack</div>
          {selectedProject && (
            <div className="projects-current-project">
              <span className="project-name">{selectedProject.name}</span>
              <span className="project-status-dot" style={{ backgroundColor: getStatusColor(calculateProjectStatus(selectedProject)) }}></span>
            </div>
          )}
        </div>
        <div className="projects-header-nav">
          <div className="projects-nav-links">
            <Link to="/projects" className="projects-nav-link active"><span className="nav-icon">▣</span>Projects</Link>
            <Link to="/" className="projects-nav-link"><span className="nav-icon">◇</span>Dashboard</Link>
            <Link to="/workbook" className="projects-nav-link"><span className="nav-icon">▣</span>Workbook</Link>
            <Link to="/milestones" className="projects-nav-link"><span className="nav-icon">◈</span>Milestones</Link>
            <Link to="/sprint-tracker" className="projects-nav-link"><span className="nav-icon">▶</span>Sprint Tracker</Link>
          </div>
        </div>
      </div>

      <div className={`projects-container ${isCollapsed ? 'collapsed' : ''}`}>
        
        {/* LEFT SIDEBAR */}
        <div className="projects-sidebar">
          <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? '▸' : '◂'}</button>
          {!isCollapsed ? (
            <>
              <div className="projects-header">
                <div className="view-toggle">
                  <button className={`view-toggle-btn ${viewMode === 'projects' ? 'active' : ''}`} onClick={() => setViewMode('projects')}>Projects</button>
                  <button className={`view-toggle-btn ${viewMode === 'developers' ? 'active' : ''}`} onClick={() => setViewMode('developers')}>Developers</button>
                </div>
                <div className="header-actions">
                  <button ref={buttonRef} className="btn-add" onClick={(e) => { e.stopPropagation(); setShowCreateMenu(!showCreateMenu); }}>+ New</button>
                  {showCreateMenu && (
                    <div ref={menuRef} className="create-menu">
                      <button className="create-menu-item" onClick={() => { setCreateType('project'); setShowCreateMenu(false); setIsCreating(true); }}><span className="menu-icon">◆</span>Create Project</button>
                      <button className="create-menu-item" onClick={() => { setCreateType('developer'); setShowCreateMenu(false); setIsCreating(true); }}><span className="menu-icon">◉</span>Add Developer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="project-list">
                {viewMode === 'projects' ? (
                  projects.map(project => (
                    <div key={project.id} className={`project-list-item ${selectedProject?.id === project.id ? 'selected' : ''} ${previewProject?.id === project.id ? 'preview' : ''}`} onClick={() => { setPreviewProject(project); }}>
                      <span className="project-item-name">{project.name}</span>
                      <span className="project-item-status" style={{ backgroundColor: getStatusColor(calculateProjectStatus(project)) }}>{calculateProjectStatus(project)}</span>
                      <div className="project-item-progress">
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${getProjectProgress(project.id)}%` }}></div></div>
                        <span className="progress-text">{getProjectProgress(project.id)}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  developers.map(dev => (
                    <div key={dev.id} className={`developer-list-item ${previewDeveloper?.id === dev.id ? 'selected' : ''}`} onClick={() => setPreviewDeveloper(dev)} style={{ cursor: 'pointer' }}>
                      <div className="developer-item-content">
                        <div className="developer-avatar-container">
                          {dev.avatar ? <img src={dev.avatar} className="developer-avatar-image" alt="avatar"/> : <div className="developer-avatar-initials" style={{ backgroundColor: getAvatarColor(dev.name) }}>{getInitials(dev.name)}</div>}
                        </div>
                        <div className="developer-info">
                          <span className="developer-name">{dev.name}</span>
                          {dev.role && <span className="developer-role">{dev.role}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="collapsed-content"><div style={{textAlign: 'center', marginTop: '20px', color: '#8e8e93', fontSize: '0.8rem'}}>View<br/>Hidden</div></div> 
          )}
        </div>

        {/* RIGHT SIDE DETAILS PANEL */}
        <div className="project-details">
          {viewMode === 'projects' ? (
            
            /* ======== PROJECT DETAILS ======== */
            displayProject ? (
              <div className="project-details-content">
                <div className="project-details-header">
                  <div className="project-details-header-left">
                    <h2 className="project-details-title">{displayProject.name}</h2>
                    <div className="project-details-meta">
                      <span className="project-status-badge" style={{ backgroundColor: getStatusColor(calculateProjectStatus(displayProject)) }}>{calculateProjectStatus(displayProject)}</span>
                      <span className="project-description-text">{displayProject.description}</span>
                    </div>
                  </div>
                  <div className="project-actions-dropdown" ref={dropdownRef}>
                    <button className="dropdown-toggle" onClick={() => setShowDropdown(!showDropdown)}>⋮</button>
                    {showDropdown && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item edit" onClick={() => { setEditingProject(displayProject); setIsEditing(true); setShowDropdown(false); }}>✎ Edit Project</button>
                        <button className="dropdown-item delete" onClick={() => handleDeleteProject(displayProject.id)}>✕ Delete Project</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="project-dates-section">
                  <div className="date-item"><span className="date-label">Start Date</span><span className="date-value">{formatDate(displayProject.start_date)}</span></div>
                  <div className="date-item"><span className="date-label">End Date</span><span className="date-value">{formatDate(displayProject.end_date)}</span></div>
                </div>

                <div className="project-developers-section">
                  <h4>Assigned Developers</h4>
                  <div className="developers-list">
                    {getDevelopersForProject(displayProject).length > 0 ? (
                      getDevelopersForProject(displayProject).map((dev, i) => (
                        <div key={i} className="developer-item">
                          <div className="developer-avatar" style={{ backgroundColor: getAvatarColor(dev) }}>{getInitials(dev)}</div>
                          <span className="developer-name">{dev}</span>
                        </div>
                      ))
                    ) : <p className="no-developers">No developers assigned.</p>}
                  </div>
                </div>

                <div className="project-stats-preview">
                    <div className="stat-preview-item"><span className="stat-preview-number">{getTaskCounts(displayProject.id).total}</span><span className="stat-preview-label">Total Tasks</span></div>
                    <div className="stat-preview-item"><span className="stat-preview-number green">{getTaskCounts(displayProject.id).complete}</span><span className="stat-preview-label">Completed</span></div>
                    <div className="stat-preview-item"><span className="stat-preview-number orange">{getTaskCounts(displayProject.id).inProgress}</span><span className="stat-preview-label">In Progress</span></div>
                    <div className="stat-preview-item"><span className="stat-preview-number red">{getOverdueCount(displayProject.id)}</span><span className="stat-preview-label">Overdue</span></div>
                </div>

                <div className="project-details-actions">
                  <button className={`btn-select-project ${selectedProject?.id === displayProject.id ? 'selected' : ''}`} onClick={() => { onSelectProject(displayProject); setPreviewProject(null); }}>
                    {selectedProject?.id === displayProject.id ? '✓ Selected' : 'Select Project'}
                  </button>
                </div>
              </div>
            ) : <div className="no-project-selected"><h3>No Project Selected</h3></div>

          ) : (

            /* ======== SLEEK DEVELOPER PROFILE ======== */
            displayDeveloper ? (
              <div className="project-details-content developer-profile-view">
                <div className="dev-profile-cover"></div>
                <div className="dev-profile-header">
                  <div className="dev-profile-avatar" style={{ backgroundColor: getAvatarColor(displayDeveloper.name) }}>
                    {displayDeveloper.avatar ? <img src={displayDeveloper.avatar} alt="Profile" /> : getInitials(displayDeveloper.name)}
                  </div>
                  
                  <div className="dev-profile-info">
                    <h2 className="project-details-title">{displayDeveloper.name}</h2>
                    <div className="dev-profile-badges">
                      <span className="dev-role-badge">{displayDeveloper.role || 'Software Developer'}</span>
                      <span className="dev-email-text">✉ {displayDeveloper.email || 'No email provided'}</span>
                    </div>
                  </div>

                  <div className="project-actions-dropdown" ref={dropdownRef}>
                    <button className="dropdown-toggle" onClick={() => setShowDropdown(!showDropdown)}>⋮</button>
                    {showDropdown && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item edit" onClick={() => { setEditingDeveloper(displayDeveloper); setIsEditingDeveloper(true); setShowDropdown(false); }}>✎ Edit Profile</button>
                        <button className="dropdown-item delete" onClick={() => handleDeleteDeveloper(displayDeveloper.id)}>✕ Remove</button>
                      </div>
                    )}
                  </div>
                </div>

                <h4 style={{marginTop: '2rem', marginBottom: '1rem', color: '#1c1c1e'}}>Current Workload</h4>
                <div className="project-stats-preview">
                    {(() => {
                      const stats = getDeveloperStats(displayDeveloper.name);
                      return (
                        <>
                          <div className="stat-preview-item"><span className="stat-preview-number">{stats.total}</span><span className="stat-preview-label">Assigned Tasks</span></div>
                          <div className="stat-preview-item"><span className="stat-preview-number green">{stats.completed}</span><span className="stat-preview-label">Completed</span></div>
                          <div className="stat-preview-item"><span className="stat-preview-number orange">{stats.inProgress}</span><span className="stat-preview-label">In Progress</span></div>
                          <div className="stat-preview-item"><span className="stat-preview-number red">{stats.overdue}</span><span className="stat-preview-label">Overdue</span></div>
                        </>
                      )
                    })()}
                </div>
              </div>
            ) : <div className="no-project-selected"><h3>No Developer Selected</h3><p>Select a developer to view their profile.</p></div>
          )}
        </div>
      </div>

      {/* ======== MODALS ======== */}
      
      {/* Create Project/Dev Modal */}
      {isCreating && (
        <div className="modal-overlay">
          <div className="modal">
             <h3>{createType === 'project' ? 'Create New Project' : 'Add New Developer'}</h3>
             <form onSubmit={createType === 'project' ? handleCreateProject : handleAddDeveloper}>
                 {createType === 'project' ? (
                     <>
                       <div className="form-group full-width"><label>Name *</label><input type="text" name="name" onChange={handleInputChange} required /></div>
                       <div className="form-group full-width"><label>Description</label><textarea name="description" onChange={handleInputChange} /></div>
                       
                       <div className="form-group full-width">
                         <label>Assign Developers</label>
                         <div className="assignee-tags-container" style={{ border: '1px solid #e5e5ea', padding: '10px', borderRadius: '8px' }}>
                           {developers.map(dev => (
                             <span 
                               key={dev.id} 
                               className={`assignee-tag ${(newProject.team || []).includes(dev.name) ? 'selected' : ''}`}
                               onClick={() => toggleNewProjectDeveloper(dev.name)}
                             >
                               {dev.name}
                             </span>
                           ))}
                         </div>
                       </div>
                     </>
                 ) : (
                     <div className="form-grid">
                        <div className="form-group full-width"><label>Name *</label><input type="text" name="name" onChange={handleDeveloperInputChange} required /></div>
                        
                        <div className="form-group full-width">
                          <label>Role</label>
                          <select value={newDeveloper.role} onChange={(e) => handleRoleSelect(e, 'new')} style={{width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc'}}>
                            <option value="" disabled>Select a Role...</option>
                            {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            <option value="ADD_NEW_ROLE" style={{fontWeight: 'bold', color: '#007aff'}}>+ Add New Role...</option>
                          </select>
                        </div>
                        
                        <div className="form-group full-width"><label>Email</label><input type="email" name="email" onChange={handleDeveloperInputChange} /></div>
                     </div>
                 )}
                 <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setIsCreating(false)}>Cancel</button>
                    <button type="submit" className="btn-save">Save</button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* FIXED: Edit Project Modal */}
      {isEditing && editingProject && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Project</h3>
            <form onSubmit={handleUpdateProject}>
               <div className="form-group full-width">
                 <label>Name *</label>
                 <input type="text" name="name" value={editingProject.name} onChange={handleEditInputChange} required />
               </div>
               <div className="form-group full-width">
                 <label>Description</label>
                 <textarea name="description" value={editingProject.description || ''} onChange={handleEditInputChange} />
               </div>
               <div className="form-grid">
                 <div className="form-group full-width">
                   <label>Start Date</label>
                   <input type="date" name="start_date" value={editingProject.start_date || ''} onChange={handleEditInputChange} />
                 </div>
                 <div className="form-group full-width">
                   <label>End Date</label>
                   <input type="date" name="end_date" value={editingProject.end_date || ''} onChange={handleEditInputChange} />
                 </div>
               </div>
               
               <div className="form-group full-width">
                 <label>Assigned Developers</label>
                 <div className="assignee-tags-container" style={{ border: '1px solid #e5e5ea', padding: '10px', borderRadius: '8px' }}>
                   {developers.map(dev => (
                     <span 
                       key={dev.id} 
                       className={`assignee-tag ${(editingProject.team || []).includes(dev.name) ? 'selected' : ''}`}
                       onClick={() => toggleEditProjectDeveloper(dev.name)}
                     >
                       {dev.name}
                     </span>
                   ))}
                 </div>
               </div>

               <div className="modal-actions">
                 <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                 <button type="submit" className="btn-save">Save Changes</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Developer Modal */}
      {isEditingDeveloper && editingDeveloper && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Developer Profile</h3>
            <form onSubmit={handleUpdateDeveloper}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Developer Name *</label>
                  <input type="text" name="name" value={editingDeveloper.name} onChange={handleEditDeveloperInputChange} required />
                </div>
                
                <div className="form-group full-width">
                  <label>Role</label>
                  <select value={editingDeveloper.role || ''} onChange={(e) => handleRoleSelect(e, 'edit')} style={{width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc'}}>
                    <option value="" disabled>Select a Role...</option>
                    {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="ADD_NEW_ROLE" style={{fontWeight: 'bold', color: '#007aff'}}>+ Add New Role...</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Email</label>
                  <input type="email" name="email" value={editingDeveloper.email || ''} onChange={handleEditDeveloperInputChange} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsEditingDeveloper(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Projects;