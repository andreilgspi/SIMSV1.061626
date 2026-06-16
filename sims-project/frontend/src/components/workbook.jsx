import React, { useState } from 'react';
import './workbook.css';

const PHASES = ['Initiation', '[P1] Prerequisites', '[P2] AP', '[P3] AR', '[P4] Inventory', '[P5] Peripherals'];
const OWNERS = ['PM', 'UI UX', 'Team', 'KC, Jess', 'Jess, KC, Franco', 'Mayon', 'Rica, QA 2'];
const STATUSES = ['Not Started', 'In Progress', 'Complete'];

function Workbook({ tasks, fetchTasks }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    phase: PHASES[0],
    task_id: '',
    task_name: '',
    start_date: '',
    end_date: '',
    predecessors: '',
    duration: 1,
    owner: OWNERS[0],
    percent_complete: 0,
    status: 'Not Started',
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      phase: PHASES[0],
      task_id: '',
      task_name: '',
      start_date: '',
      end_date: '',
      predecessors: '',
      duration: 1,
      owner: OWNERS[0],
      percent_complete: 0,
      status: 'Not Started',
      notes: ''
    });
    setIsAdding(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingTask 
      ? `http://localhost:5000/api/tasks/${editingTask.id}`
      : 'http://localhost:5000/api/tasks';
    
    const method = editingTask ? 'PUT' : 'POST';
    
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      fetchTasks();
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      phase: task.phase,
      task_id: task.task_id,
      task_name: task.task_name,
      start_date: task.start_date,
      end_date: task.end_date,
      predecessors: task.predecessors || '',
      duration: task.duration,
      owner: task.owner,
      percent_complete: task.percent_complete,
      status: task.status,
      notes: task.notes || ''
    });
    setIsAdding(true);
  };

  return (
    <div className="workbook">
      <div className="workbook-header">
        <h2>Task Workbook</h2>
        <button 
          className="btn-add"
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
        >
          + Add New Task
        </button>
      </div>

      {isAdding && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Phase *</label>
                  <select name="phase" value={formData.phase} onChange={handleInputChange} required>
                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Task ID *</label>
                  <input type="text" name="task_id" value={formData.task_id} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Task Name *</label>
                  <input type="text" name="task_name" value={formData.task_name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Predecessors</label>
                  <input type="text" name="predecessors" value={formData.predecessors} onChange={handleInputChange} placeholder="e.g., 1.23, 1.24" />
                </div>
                <div className="form-group">
                  <label>Duration (Days) *</label>
                  <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} required min="1" />
                </div>
                <div className="form-group">
                  <label>Owner *</label>
                  <select name="owner" value={formData.owner} onChange={handleInputChange} required>
                    {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>% Complete</label>
                  <input type="number" name="percent_complete" value={formData.percent_complete} onChange={handleInputChange} min="0" max="100" />
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} required>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2"></textarea>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn-save">{editingTask ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tasks-table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Task ID</th>
              <th>Task Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Duration</th>
              <th>Owner</th>
              <th>% Complete</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.phase}</td>
                <td>{task.task_id}</td>
                <td>{task.task_name}</td>
                <td>{new Date(task.start_date).toLocaleDateString()}</td>
                <td>{new Date(task.end_date).toLocaleDateString()}</td>
                <td>{task.duration}</td>
                <td>{task.owner}</td>
                <td>{task.percent_complete}%</td>
                <td>
                  <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
                    {task.status}
                  </span>
                </td>
                <td className="actions">
                  <button className="btn-edit" onClick={() => handleEdit(task)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(task.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default workbook;