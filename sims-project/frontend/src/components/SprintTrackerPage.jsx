// src/components/SprintTrackerPage.jsx
import React, { useState } from 'react';
import SprintMaster from './SprintMaster';
import SprintOverview from './SprintOverview';
import SprintView from './SprintView';
import './SprintTracker.css';

const SprintTrackerPage = () => {
  const [activeTab, setActiveTab] = useState('master');

  return (
    <div className="sprint-tracker-view">
      
      {/* --- NEW: The Big Master Container Card --- */}
      <div className="master-wrapper-card">
        
        <div className="tracker-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            All Sprints Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            Single Sprint View
          </button>
          <button 
            className={`tab-btn ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => setActiveTab('master')}
          >
            Sprint Master (Task Register)
          </button>
        </div>

        {/* Render the selected component inside the master card */}
        {activeTab === 'overview' && <SprintOverview />}
        {activeTab === 'view' && <SprintView />}
        {activeTab === 'master' && <SprintMaster />}
        
      </div>
      
    </div>
  );
};

export default SprintTrackerPage;