// src/components/SprintTrackerPage.jsx
import React, { useState } from 'react';
import SprintMaster from './SprintMaster';
import SprintOverview from './SprintOverview';
import SprintView from './SprintView';
import './SprintTracker.css';

const SprintTrackerPage = ({ selectedProject, phases, fetchPhases }) => {
  const [activeTab, setActiveTab] = useState('master');

  if (!selectedProject) {
    return (
      <div className="sprint-tracker-view">
        <div className="master-wrapper-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', color: '#8e8e93' }}>◈</div>
            <h2 style={{ color: '#1c1c1e', marginBottom: '8px' }}>No Project Selected</h2>
            <p style={{ color: '#8e8e93' }}>Select a project from the Projects tab to manage its sprints.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sprint-tracker-view">
      <div className="master-wrapper-card">
        <div className="tracker-tabs">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>All Sprints Overview</button>
          <button className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>Single Sprint View</button>
          <button className={`tab-btn ${activeTab === 'master' ? 'active' : ''}`} onClick={() => setActiveTab('master')}>Sprint Master (Task Register)</button>
        </div>

        {activeTab === 'overview' && <SprintOverview selectedProject={selectedProject} />}
        {activeTab === 'view' && <SprintView selectedProject={selectedProject} />}
        {activeTab === 'master' && <SprintMaster selectedProject={selectedProject} phases={phases} fetchPhases={fetchPhases} />}
      </div>
    </div>
  );
};

export default SprintTrackerPage;