import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as db from '../services/database';
import './Projects.css';

function Projects({ projects, selectedProject, onSelectProject, fetchProjects }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  });
  const [editingProject, setEditingProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newDeveloper, setNewDeveloper] = useState({
    name: '',
    email: '',
    role: '',
    avatar: null
  });
  const [projectTasks, setProjectTasks] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('projects');
  const [developers, setDevelopers] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createType, setCreateType] = useState('project');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  const [dateError, setDateError] = useState('');

  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch developers from Supabase
  const fetchDevelopers = async () => {
    try {
      const data = await db.fetchDevelopers();
      setDevelopers(data);
    } catch (error) {
      console.error('Error fetching developers:', error);
    }
  };

  // Fetch tasks for all projects
  const fetchAllProjectTasks = async () => {
    setLoading(true);
    try {
      const tasksData = {};
      for (const project of projects) {
        const data = await db.fetchTasksByProject(project.id);
        tasksData[project.id] = data;
      }
      setProjectTasks(tasksData);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      fetchAllProjectTasks();
    }
    fetchDevelopers();
  }, [projects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate project status - AUTOMATICALLY determined by tasks
  const calculateProjectStatus = (project) => {
    if (!project || !project.start_date || !project.end_date) return 'On Track';
    
    const today = new Date();
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    
    if (today > end) return 'Done';
    
    const tasks = projectTasks[project.id] || [];
    
    const hasOverdueTasks = tasks.some(t => {
      if (t.status === 'Complete') return false;
      const taskEnd = new Date(t.end_date);
      return taskEnd < today;
    });
    
    if (hasOverdueTasks) return 'Behind';
    if (today < start) return 'On Track';
    
    const totalDuration = end - start;
    const elapsed = today - start;
    const progress = (elapsed / totalDuration) * 100;
    
    const totalTasks = tasks.length;
    if (totalTasks === 0) return 'On Track';
    
    const completedTasks = tasks.filter(t => t.status === 'Complete').length;
    const completionRate = (completedTasks / totalTasks) * 100;
    const difference = completionRate - progress;
    
    if (difference < -15) return 'Behind';
    
    return 'On Track';
  };

  const getStatusColor = (status) => {
    const colors = {
      'On Track': '#34c759',
      'Behind': '#ff3b30',
      'Done': '#5856d6'
    };
    return colors[status] || '#8e8e93';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
    
    if (name === 'start_date' || name === 'end_date') {
      validateDates(name === 'start_date' ? value : newProject.start_date, 
                   name === 'end_date' ? value : newProject.end_date);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingProject(prev => ({ ...prev, [name]: value }));
    
    if (name === 'start_date' || name === 'end_date') {
      validateDatesEdit(name === 'start_date' ? value : editingProject?.start_date, 
                        name === 'end_date' ? value : editingProject?.end_date);
    }
  };

  const validateDates = (startDate, endDate) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        setDateError('End date cannot be earlier than start date');
        return false;
      }
      setDateError('');
      return true;
    }
    setDateError('');
    return true;
  };

  const validateDatesEdit = (startDate, endDate) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        setDateError('End date cannot be earlier than start date');
        return false;
      }
      setDateError('');
      return true;
    }
    setDateError('');
    return true;
  };

  const handleDeveloperInputChange = (e) => {
    const { name, value } = e.target;
    setNewDeveloper(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      e.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPG, PNG, GIF, or WEBP)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      setAvatarPreview(base64String);
      setNewDeveloper(prev => ({ 
        ...prev, 
        avatar: base64String 
      }));
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setNewDeveloper(prev => ({ ...prev, avatar: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (newProject.start_date && newProject.end_date) {
      const start = new Date(newProject.start_date);
      const end = new Date(newProject.end_date);
      if (end < start) {
        setDateError('End date cannot be earlier than start date');
        return;
      }
    }
    
    try {
      const data = await db.createProject({
        name: newProject.name,
        description: newProject.description,
        start_date: newProject.start_date,
        end_date: newProject.end_date
      });
      
      await fetchProjects();
      setIsCreating(false);
      setShowCreateMenu(false);
      setDateError('');
      setNewProject({
        name: '',
        description: '',
        start_date: '',
        end_date: ''
      });
      
      if (data) {
        onSelectProject(data);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    
    if (editingProject.start_date && editingProject.end_date) {
      const start = new Date(editingProject.start_date);
      const end = new Date(editingProject.end_date);
      if (end < start) {
        setDateError('End date cannot be earlier than start date');
        return;
      }
    }
    
    try {
      await db.updateProject(editingProject.id, {
        name: editingProject.name,
        description: editingProject.description,
        start_date: editingProject.start_date,
        end_date: editingProject.end_date
      });
      
      await fetchProjects();
      setIsEditing(false);
      setEditingProject(null);
      setShowDropdown(false);
      setDateError('');
      
      const updatedProject = await db.fetchProjects();
      const found = updatedProject.find(p => p.id === editingProject.id);
      if (found) onSelectProject(found);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleAddDeveloper = async (e) => {
    e.preventDefault();
    try {
      await db.createDeveloper({
        name: newDeveloper.name,
        email: newDeveloper.email,
        role: newDeveloper.role,
        avatar: newDeveloper.avatar
      });

      await fetchDevelopers();
      setIsCreating(false);
      setShowCreateMenu(false);
      setNewDeveloper({
        name: '',
        email: '',
        role: '',
        avatar: null
      });
      setAvatarPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error adding developer:', error);
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('⚠️ Are you sure you want to delete this project and all its tasks? This action cannot be undone.')) {
      try {
        await db.deleteProject(id);
        await fetchProjects();
        setShowDropdown(false);
        
        const updatedProjects = await db.fetchProjects();
        if (updatedProjects.length > 0) {
          onSelectProject(updatedProjects[0]);
        } else {
          onSelectProject(null);
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleEditClick = () => {
    if (selectedProject) {
      setEditingProject({ ...selectedProject });
      setIsEditing(true);
      setShowDropdown(false);
      setDateError('');
    }
  };

  const getProjectProgress = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    if (tasks.length === 0) return 0;
    const totalPercentComplete = tasks.reduce((sum, t) => sum + t.percent_complete, 0);
    return Math.round(totalPercentComplete / tasks.length);
  };

  const getTaskCounts = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    return {
      total: tasks.length,
      complete: tasks.filter(t => t.status === 'Complete').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      notStarted: tasks.filter(t => t.status === 'Not Started').length
    };
  };

  const getDevelopersForProject = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    const ownerSet = new Set();
    tasks.forEach(task => {
      if (task.owner) {
        const owners = task.owner.split(',').map(o => o.trim());
        owners.forEach(o => ownerSet.add(o));
      }
    });
    return Array.from(ownerSet);
  };

  const getOverdueCount = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    const today = new Date();
    return tasks.filter(t => new Date(t.end_date) < today && t.status !== 'Complete').length;
  };

  const getAvatarColor = (name) => {
    const colors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6', '#ff2d55', '#30b0c0', '#af52de'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleProjectClick = (project) => {
    setPreviewProject(project);
  };

  const handleSelectProject = (project) => {
    if (project && project.id) {
      onSelectProject(project);
      setPreviewProject(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const getDeveloperAvatar = (developer) => {
    if (developer.avatar && developer.avatar.startsWith('data:image')) {
      return developer.avatar;
    }
    return null;
  };

  const handleCreateButtonClick = (e) => {
    e.stopPropagation();
    setShowCreateMenu(!showCreateMenu);
    setDateError('');
  };

  const handleMenuItemClick = (type) => {
    setCreateType(type);
    setShowCreateMenu(false);
    setIsCreating(true);
    setDateError('');
    if (type === 'project') {
      setNewProject({
        name: '',
        description: '',
        start_date: '',
        end_date: ''
      });
    } else {
      setNewDeveloper({
        name: '',
        email: '',
        role: '',
        avatar: null
      });
      setAvatarPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayProject = previewProject || selectedProject;

  // Projects Header Component with stacked layout
  const ProjectsHeader = () => {
    return (
      <div className="projects-global-header">
        <div className="projects-header-top">
          <div className="projects-brand">IntelliTrack</div>
          {selectedProject && (
            <div className="projects-current-project">
              <span className="project-name">{selectedProject.name}</span>
              <span 
                className="project-status-dot"
                style={{ backgroundColor: getStatusColor(calculateProjectStatus(selectedProject)) }}
              ></span>
            </div>
          )}
        </div>
        <div className="projects-header-nav">
          <div className="projects-nav-links">
            <Link to="/projects" className="projects-nav-link active">
              <span className="nav-icon">▣</span>
              Projects
            </Link>
            <Link to="/" className="projects-nav-link">
              <span className="nav-icon">◇</span>
              Dashboard
            </Link>
            <Link to="/workbook" className="projects-nav-link">
              <span className="nav-icon">▣</span>
              Workbook
            </Link>
            <Link to="/milestones" className="projects-nav-link">
              <span className="nav-icon">◈</span>
              Milestones
            </Link>
            <Link to="/sprint-tracker" className="projects-nav-link">
              <span className="nav-icon">▶</span>
              Sprint Tracker
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ProjectsHeader />
      <div className={`projects-container ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Left Sidebar */}
        <div className="projects-sidebar">
          <button 
            className="collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '▸' : '◂'}
          </button>

          {!isCollapsed ? (
            <>
              <div className="projects-header">
                <div className="view-toggle">
                  <button 
                    className={`view-toggle-btn ${viewMode === 'projects' ? 'active' : ''}`}
                    onClick={() => setViewMode('projects')}
                  >
                    Projects
                  </button>
                  <button 
                    className={`view-toggle-btn ${viewMode === 'developers' ? 'active' : ''}`}
                    onClick={() => setViewMode('developers')}
                  >
                    Developers
                  </button>
                </div>
                <div className="header-actions">
                  <button 
                    ref={buttonRef}
                    className="btn-add"
                    onClick={handleCreateButtonClick}
                  >
                    + New
                  </button>

                  {showCreateMenu && (
                    <div ref={menuRef} className="create-menu">
                      <button 
                        className="create-menu-item"
                        onClick={() => handleMenuItemClick('project')}
                      >
                        <span className="menu-icon">◆</span>
                        Create New Project
                      </button>
                      <button 
                        className="create-menu-item"
                        onClick={() => handleMenuItemClick('developer')}
                      >
                        <span className="menu-icon">◉</span>
                        Add New Developer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Modal */}
              {isCreating && (
                <div className="modal-overlay">
                  <div className="modal">
                    <h3>{createType === 'project' ? 'Create New Project' : 'Add New Developer'}</h3>
                    <form onSubmit={createType === 'project' ? handleCreateProject : handleAddDeveloper}>
                      {createType === 'project' ? (
                        <>
                          <div className="form-grid">
                            <div className="form-group full-width">
                              <label>Project Name *</label>
                              <input 
                                type="text" 
                                name="name" 
                                value={newProject.name} 
                                onChange={handleInputChange} 
                                required 
                                placeholder="Enter project name"
                              />
                            </div>
                            <div className="form-group full-width">
                              <label>Description</label>
                              <textarea 
                                name="description" 
                                value={newProject.description} 
                                onChange={handleInputChange} 
                                rows="3"
                                placeholder="Brief description of the project"
                              />
                            </div>
                            <div className="form-group">
                              <label>Start Date</label>
                              <input 
                                type="date" 
                                name="start_date" 
                                value={newProject.start_date} 
                                onChange={handleInputChange} 
                              />
                            </div>
                            <div className="form-group">
                              <label>End Date</label>
                              <input 
                                type="date" 
                                name="end_date" 
                                value={newProject.end_date} 
                                onChange={handleInputChange} 
                              />
                            </div>
                            {dateError && (
                              <div className="form-group full-width">
                                <div className="date-error">{dateError}</div>
                              </div>
                            )}
                            <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#8e8e93', 
                                background: '#f8f9fa', 
                                padding: '0.5rem 0.75rem', 
                                borderRadius: '8px',
                                border: '0.5px solid rgba(60, 60, 67, 0.06)'
                              }}>
                                <strong>Note:</strong> Project status is automatically determined by task completion and overdue tasks.
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="form-grid">
                            <div className="form-group full-width">
                              <label>Developer Name *</label>
                              <input 
                                type="text" 
                                name="name" 
                                value={newDeveloper.name} 
                                onChange={handleDeveloperInputChange} 
                                required 
                                placeholder="Enter full name"
                              />
                            </div>
                            <div className="form-group full-width">
                              <label>Email</label>
                              <input 
                                type="email" 
                                name="email" 
                                value={newDeveloper.email} 
                                onChange={handleDeveloperInputChange} 
                                placeholder="developer@example.com"
                              />
                            </div>
                            <div className="form-group full-width">
                              <label>Role</label>
                              <input 
                                type="text" 
                                name="role" 
                                value={newDeveloper.role} 
                                onChange={handleDeveloperInputChange} 
                                placeholder="e.g., Frontend Developer"
                              />
                            </div>
                            <div className="form-group full-width">
                              <label>Profile Picture</label>
                              <div className="avatar-upload-simple">
                                {avatarPreview ? (
                                  <div className="avatar-preview-simple">
                                    <img src={avatarPreview} alt="Avatar preview" />
                                    <button 
                                      type="button" 
                                      className="avatar-remove-simple"
                                      onClick={handleRemoveAvatar}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="avatar-upload-box">
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept="image/*"
                                      onChange={handleAvatarUpload}
                                      id="avatar-simple-upload"
                                    />
                                    <label htmlFor="avatar-simple-upload" className="avatar-upload-label">
                                      <span className="upload-icon">🖼</span>
                                      <span>Click to upload image</span>
                                      <small>JPG, PNG, GIF (max 5MB)</small>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={() => {
                          setIsCreating(false);
                          setShowCreateMenu(false);
                          setAvatarPreview(null);
                          setDateError('');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}>Cancel</button>
                        <button type="submit" className="btn-save">
                          {createType === 'project' ? 'Create Project' : 'Add Developer'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Modal */}
              {isEditing && editingProject && (
                <div className="modal-overlay">
                  <div className="modal">
                    <h3>Edit Project</h3>
                    <form onSubmit={handleUpdateProject}>
                      <div className="form-grid">
                        <div className="form-group full-width">
                          <label>Project Name *</label>
                          <input 
                            type="text" 
                            name="name" 
                            value={editingProject.name} 
                            onChange={handleEditInputChange} 
                            required 
                            placeholder="Enter project name"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>Description</label>
                          <textarea 
                            name="description" 
                            value={editingProject.description || ''} 
                            onChange={handleEditInputChange} 
                            rows="3"
                            placeholder="Brief description of the project"
                          />
                        </div>
                        <div className="form-group">
                          <label>Start Date</label>
                          <input 
                            type="date" 
                            name="start_date" 
                            value={editingProject.start_date || ''} 
                            onChange={handleEditInputChange} 
                          />
                        </div>
                        <div className="form-group">
                          <label>End Date</label>
                          <input 
                            type="date" 
                            name="end_date" 
                            value={editingProject.end_date || ''} 
                            onChange={handleEditInputChange} 
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>Current Status (Auto-calculated)</label>
                          <div style={{
                            padding: '0.75rem',
                            borderRadius: '12px',
                            background: '#f8f9fa',
                            border: '0.5px solid rgba(60, 60, 67, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            <span 
                              className="project-status-badge"
                              style={{ 
                                backgroundColor: getStatusColor(calculateProjectStatus(editingProject)),
                                padding: '0.2rem 0.8rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: 'white',
                                display: 'inline-block'
                              }}
                            >
                              {calculateProjectStatus(editingProject)}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#8e8e93' }}>
                              (Determined by task completion & overdue tasks)
                            </span>
                          </div>
                        </div>
                        {dateError && (
                          <div className="form-group full-width">
                            <div className="date-error">{dateError}</div>
                          </div>
                        )}
                      </div>
                      <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={() => {
                          setIsEditing(false);
                          setEditingProject(null);
                          setDateError('');
                        }}>Cancel</button>
                        <button type="submit" className="btn-save">Update Project</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Content List */}
              <div className="project-list">
                {loading ? (
                  <div className="loading-text">Loading...</div>
                ) : viewMode === 'projects' ? (
                  projects.map((project) => {
                    const progress = getProjectProgress(project.id);
                    const isSelected = selectedProject && selectedProject.id === project.id;
                    const isPreview = previewProject && previewProject.id === project.id;
                    const status = calculateProjectStatus(project);
                    
                    return (
                      <div 
                        key={project.id} 
                        className={`project-list-item ${isSelected ? 'selected' : ''} ${isPreview ? 'preview' : ''}`}
                        onClick={() => handleProjectClick(project)}
                      >
                        <span className="project-item-name">{project.name}</span>
                        <span 
                          className="project-item-status"
                          style={{ backgroundColor: getStatusColor(status) }}
                        >
                          {status}
                        </span>
                        <span className="project-item-dates">
                          {project.start_date && (
                            <span>{formatDate(project.start_date)}</span>
                          )}
                          {project.end_date && (
                            <span> → {formatDate(project.end_date)}</span>
                          )}
                        </span>
                        <div className="project-item-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{progress}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  developers.map((developer) => (
                    <div key={developer.id} className="developer-list-item">
                      <div className="developer-item-content">
                        <div className="developer-avatar-container">
                          {getDeveloperAvatar(developer) ? (
                            <img 
                              src={developer.avatar} 
                              alt={developer.name}
                              className="developer-avatar-image"
                            />
                          ) : (
                            <div 
                              className="developer-avatar-initials"
                              style={{ backgroundColor: getAvatarColor(developer.name) }}
                            >
                              {getInitials(developer.name)}
                            </div>
                          )}
                        </div>
                        <div className="developer-info">
                          <span className="developer-name">{developer.name}</span>
                          {developer.role && (
                            <span className="developer-role">{developer.role}</span>
                          )}
                          {developer.email && (
                            <span className="developer-email">{developer.email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="collapsed-content">
              {projects.map((project) => {
                const isSelected = selectedProject && selectedProject.id === project.id;
                const progress = getProjectProgress(project.id);
                const status = calculateProjectStatus(project);
                
                return (
                  <div 
                    key={project.id} 
                    className={`collapsed-project-item ${isSelected ? 'active' : 'inactive'}`}
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="collapsed-project-initials">
                      {getInitials(project.name)}
                    </div>
                    <div className="collapsed-project-name">
                      {project.name}
                    </div>
                    <div className="collapsed-project-status-dot-container">
                      <div 
                        className="collapsed-project-status-dot"
                        style={{ backgroundColor: getStatusColor(status) }}
                      ></div>
                    </div>
                    {isSelected && (
                      <div className="collapsed-selected-badge">●</div>
                    )}
                    {!isSelected && (
                      <div className="collapsed-project-progress">
                        <div className="collapsed-progress-bar">
                          <div 
                            className="collapsed-progress-fill" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side - Project Details */}
        <div className="project-details">
          {displayProject ? (
            <div className="project-details-content">
              <div className="project-details-header">
                <div className="project-details-header-left">
                  <h2 className="project-details-title">{displayProject.name}</h2>
                  <div className="project-details-meta">
                    <span 
                      className="project-status-badge"
                      style={{ backgroundColor: getStatusColor(calculateProjectStatus(displayProject)) }}
                    >
                      {calculateProjectStatus(displayProject)}
                    </span>
                    {displayProject.description && (
                      <span className="project-description-text">{displayProject.description}</span>
                    )}
                  </div>
                </div>
                <div className="project-actions-dropdown" ref={dropdownRef}>
                  <button 
                    className="dropdown-toggle"
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-label="Project actions"
                  >
                    ⋮
                  </button>
                  {showDropdown && (
                    <div className="dropdown-menu">
                      <button 
                        className="dropdown-item edit"
                        onClick={handleEditClick}
                      >
                        <span className="dropdown-icon">✎</span>
                        Edit Project
                      </button>
                      <div className="dropdown-divider"></div>
                      <button 
                        className="dropdown-item delete"
                        onClick={() => handleDeleteProject(displayProject.id)}
                      >
                        <span className="dropdown-icon">✕</span>
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="project-dates-section">
                <div className="date-item">
                  <span className="date-label">Start Date</span>
                  <span className="date-value">
                    {formatDate(displayProject.start_date)}
                  </span>
                </div>
                <div className="date-item">
                  <span className="date-label">End Date</span>
                  <span className="date-value">
                    {formatDate(displayProject.end_date)}
                  </span>
                </div>
              </div>

              <div className="project-developers-section">
                <h4>Developers</h4>
                <div className="developers-list">
                  {getDevelopersForProject(displayProject.id).length > 0 ? (
                    getDevelopersForProject(displayProject.id).map((dev, index) => (
                      <div key={index} className="developer-item">
                        <div 
                          className="developer-avatar"
                          style={{ backgroundColor: getAvatarColor(dev) }}
                        >
                          {getInitials(dev)}
                        </div>
                        <span className="developer-name">{dev}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-developers">No developers assigned yet.</p>
                  )}
                </div>
              </div>

              <div className="project-stats-preview">
                {(() => {
                  const counts = getTaskCounts(displayProject.id);
                  const overdue = getOverdueCount(displayProject.id);
                  const devCount = getDevelopersForProject(displayProject.id).length;
                  
                  return (
                    <>
                      <div className="stat-preview-item">
                        <span className="stat-preview-number">{counts.total}</span>
                        <span className="stat-preview-label">Total Tasks</span>
                      </div>
                      <div className="stat-preview-item">
                        <span className="stat-preview-number green">{counts.complete}</span>
                        <span className="stat-preview-label">Completed</span>
                      </div>
                      <div className="stat-preview-item">
                        <span className="stat-preview-number orange">{counts.inProgress}</span>
                        <span className="stat-preview-label">In Progress</span>
                      </div>
                      <div className="stat-preview-item">
                        <span className="stat-preview-number gray">{counts.notStarted}</span>
                        <span className="stat-preview-label">Not Started</span>
                      </div>
                      <div className="stat-preview-item">
                        <span className="stat-preview-number red">{overdue}</span>
                        <span className="stat-preview-label">Overdue</span>
                      </div>
                      <div className="stat-preview-item">
                        <span className="stat-preview-number gradient">{devCount}</span>
                        <span className="stat-preview-label">Developers</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="project-details-actions">
                <button 
                  className={`btn-select-project ${selectedProject && selectedProject.id === displayProject.id ? 'selected' : ''}`}
                  onClick={() => handleSelectProject(displayProject)}
                >
                  {selectedProject && selectedProject.id === displayProject.id ? '✓ Selected' : 'Select'}
                </button>
              </div>
            </div>
          ) : (
            <div className="no-project-selected">
              <div className="no-project-icon">◈</div>
              <h3>No Project Selected</h3>
              <p>Select a project from the left sidebar to view details.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Projects;