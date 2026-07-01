import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/dashboard';
import Workbook from './components/workbook';
import Projects from './components/Projects';
import Milestones from './components/Milestones';
import SprintTrackerPage from './components/SprintTrackerPage';
import { ModalProvider } from './components/ModalProvider';
import './App.css';
import * as db from './services/database';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import CreateAcc from './components/CreateAcc';
import UserSettings from './components/UserSettings';

function AppContent() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectTasks, setProjectTasks] = useState({});
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isProjectsPage = location.pathname === '/projects';

  const fetchProjects = async () => {
    try {
      const data = await db.fetchProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId) => {
    if (!projectId) return;
    try {
      const data = await db.fetchTasksByProject(projectId);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchPhases = async (projectId) => {
    if (!projectId) return;
    try {
      const data = await db.fetchPhasesByProject(projectId);
      setPhases(data);
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  };

  // Fetch tasks for all projects to determine status
  const fetchAllProjectTasks = async () => {
    try {
      const tasksData = {};
      for (const project of projects) {
        const data = await db.fetchTasksByProject(project.id);
        tasksData[project.id] = data;
      }
      setProjectTasks(tasksData);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchAllProjectTasks();
    }
  }, [projects]);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject.id);
      fetchPhases(selectedProject.id);
    }
  }, [selectedProject]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  const handleProjectCreated = async () => {
    await fetchProjects();
    if (projects.length > 0) {
      setSelectedProject(projects[0]);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Get current page name for active state
  const getPageName = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/workbook') return 'Workbook';
    if (path === '/milestones') return 'Milestones';
    if (path === '/sprint-tracker') return 'Sprint Tracker';
    if (path === '/projects') return 'Projects';
    return '';
  };

  const currentPage = getPageName();

  // Calculate project status - Same logic as Projects tab
  const calculateProjectStatus = (project) => {
    if (!project || !project.start_date || !project.end_date) return 'On Track';
    
    const today = new Date();
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    
    // If project end date is in the past, mark as Done
    if (today > end) return 'Done';
    
    // Get tasks for this project
    const tasks = projectTasks[project.id] || [];
    
    // Check if ANY task is overdue (not complete and end date is in the past)
    const hasOverdueTasks = tasks.some(t => {
      if (t.status === 'Complete') return false;
      const taskEnd = new Date(t.end_date);
      return taskEnd < today;
    });
    
    // If there's at least one overdue task, mark as Behind
    if (hasOverdueTasks) return 'Behind';
    
    // If project hasn't started yet, mark as On Track
    if (today < start) return 'On Track';
    
    // Calculate progress to determine if Behind or On Track
    const totalDuration = end - start;
    const elapsed = today - start;
    const progress = (elapsed / totalDuration) * 100;
    
    const totalTasks = tasks.length;
    if (totalTasks === 0) return 'On Track';
    
    const completedTasks = tasks.filter(t => t.status === 'Complete').length;
    const completionRate = (completedTasks / totalTasks) * 100;
    const difference = completionRate - progress;
    
    // If completion rate is significantly behind schedule, mark as Behind
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

  return (
    <div className="app">
      {/* Show global navbar with new design for non-project pages */}
      {!isProjectsPage && (
        <nav className="navbar-new">
          <div className="navbar-new-top">
            <div className="navbar-brand">IntelliTrack</div>
            {selectedProject && (
              <div className="navbar-current-project">
                <span className="navbar-project-name">{selectedProject.name}</span>
                <span 
                  className="navbar-project-dot"
                  style={{ backgroundColor: getStatusColor(calculateProjectStatus(selectedProject)) }}
                ></span>
              </div>
            )}
            <div className="navbar-spacer"></div>
            
            <button 
              className="navbar-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              ☰
            </button>

            <div className={`navbar-actions ${isMobileMenuOpen ? 'open' : ''}`}>
              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="navbar-settings-btn"
                style={{
                  background: 'rgba(0, 122, 255, 0.12)',
                  color: '#007aff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0, 122, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0, 122, 255, 0.12)'}
              >
                👤
              </button>
              <button 
                onClick={() => supabase.auth.signOut()} 
                className="navbar-logout-btn"
                style={{
                  background: 'rgba(255, 59, 48, 0.12)',
                  color: '#ff3b30',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.12)'}
              >
                Sign Out
              </button>
            </div>
          </div>
          <div className={`navbar-new-nav ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="navbar-nav-links">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`navbar-nav-link ${currentPage === 'Dashboard' ? 'active' : ''}`}>
                <span className="nav-icon">◇</span>
                Dashboard
              </Link>
              <Link to="/workbook" onClick={() => setIsMobileMenuOpen(false)} className={`navbar-nav-link ${currentPage === 'Workbook' ? 'active' : ''}`}>
                <span className="nav-icon">▣</span>
                Workbook
              </Link>
              <Link to="/milestones" onClick={() => setIsMobileMenuOpen(false)} className={`navbar-nav-link ${currentPage === 'Milestones' ? 'active' : ''}`}>
                <span className="nav-icon">◈</span>
                Milestones
              </Link>
              <Link to="/sprint-tracker" onClick={() => setIsMobileMenuOpen(false)} className={`navbar-nav-link ${currentPage === 'Sprint Tracker' ? 'active' : ''}`}>
                <span className="nav-icon">▶</span>
                Sprint Tracker
              </Link>
              <Link to="/projects" onClick={() => setIsMobileMenuOpen(false)} className={`navbar-nav-link ${currentPage === 'Projects' ? 'active' : ''}`}>
                <span className="nav-icon">▣</span>
                Projects
              </Link>
            </div>
          </div>
        </nav>
      )} {/* <-- FIXED: This closing bracket was deleted in the merge! */}

      <Routes>
        <Route path="/" element={
          <Dashboard 
            tasks={tasks} 
            selectedProject={selectedProject}
            projectPhases={phases}
          />
        } />
        <Route path="/workbook" element={
          <Workbook 
            tasks={tasks} 
            selectedProject={selectedProject}
            phases={phases}
            fetchTasks={() => fetchTasks(selectedProject?.id)}
            fetchPhases={() => fetchPhases(selectedProject?.id)}
          />
        } />
        <Route path="/projects" element={
          <Projects 
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={handleSelectProject}
            fetchProjects={fetchProjects}
            onProjectCreated={handleProjectCreated}
            onSettingsClick={() => setShowSettingsModal(true)}
            onSignOut={() => supabase.auth.signOut()}
          />
        } />
        <Route path="/milestones" element={
          <Milestones 
            selectedProject={selectedProject}
          />
        } />
        {/* 3. Add Sprint Tracker Routing */}
        <Route path="/sprint-tracker" element={
          <SprintTrackerPage 
            selectedProject={selectedProject} 
            phases={phases}
            fetchPhases={() => fetchPhases(selectedProject?.id)}
          />
        } />
      </Routes>
      
      {showSettingsModal && (
        <UserSettings onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}

// FIXED: Re-added the main App wrapper for the Router
function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return <div className="loading">Checking authentication...</div>;
  }

  if (!session) {
    return authView === 'login' ? (
      <Login onNavigateToRegister={() => setAuthView('register')} />
    ) : (
      <CreateAcc onNavigateToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <Router>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </Router>
  );
}

export default App;