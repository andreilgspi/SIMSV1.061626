import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Workbook from './components/Workbook';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">SIMS</div>
          <div className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/workbook">Workbook</Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard tasks={tasks} fetchTasks={fetchTasks} />} />
          <Route path="/workbook" element={<Workbook tasks={tasks} fetchTasks={fetchTasks} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;