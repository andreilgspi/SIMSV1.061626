import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Workbook from './components/Workbook';
import Projects from './components/Projects';
import Milestones from './components/Milestones';
import SprintTracker from './components/SprintTracker';
import './App.css';

function AppContent() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const isProjectsPage = location.pathname === '/projects';

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      const data = await response.json();
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
      const response = await fetch(`http://localhost:5000/api/tasks/${projectId}`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchPhases = async (projectId) => {
    if (!projectId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/phases/${projectId}`);
      const data = await response.json();
      setPhases(data);
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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
                <span className="navbar-project-dot"></span>
              </div>
            )}
            <div className="navbar-spacer"></div>
          </div>
          <div className="navbar-new-nav">
            <div className="navbar-nav-links">
              <Link to="/" className={`navbar-nav-link ${currentPage === 'Dashboard' ? 'active' : ''}`}>
                <span className="nav-icon">◇</span>
                Dashboard
              </Link>
              <Link to="/workbook" className={`navbar-nav-link ${currentPage === 'Workbook' ? 'active' : ''}`}>
                <span className="nav-icon">▣</span>
                Workbook
              </Link>
              <Link to="/milestones" className={`navbar-nav-link ${currentPage === 'Milestones' ? 'active' : ''}`}>
                <span className="nav-icon">◈</span>
                Milestones
              </Link>
              <Link to="/sprint-tracker" className={`navbar-nav-link ${currentPage === 'Sprint Tracker' ? 'active' : ''}`}>
                <span className="nav-icon">▶</span>
                Sprint Tracker
              </Link>
              <Link to="/projects" className={`navbar-nav-link ${currentPage === 'Projects' ? 'active' : ''}`}>
                <span className="nav-icon">▣</span>
                Projects
              </Link>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={
          <Dashboard 
            tasks={tasks} 
            selectedProject={selectedProject}
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
          />
        } />
        <Route path="/milestones" element={
          <Milestones 
            selectedProject={selectedProject}
          />
        } />
        <Route path="/sprint-tracker" element={
          <SprintTracker />
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;