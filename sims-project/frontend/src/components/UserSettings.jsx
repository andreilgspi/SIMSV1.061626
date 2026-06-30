import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './UserSettings.css';
import { useModal } from './ModalProvider';

function UserSettings({ onClose }) {
  const { showAlert } = useModal();
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user);
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showAlert('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match.');
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    setIsUpdating(false);

    if (error) {
      showAlert(error.message);
    } else {
      showAlert('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal user-settings-modal">
        <div className="modal-header">
          <h3>User Settings</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        {user && (
          <div className="settings-section">
            <h4>Account Information</h4>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">User ID:</span>
              <span className="info-value" style={{ fontSize: '0.8rem', color: '#8e8e93' }}>{user.id}</span>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h4>Change Password</h4>
          <form onSubmit={handleUpdatePassword}>
            <div className="form-group full-width">
              <label>New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group full-width">
              <label>Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-save" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
