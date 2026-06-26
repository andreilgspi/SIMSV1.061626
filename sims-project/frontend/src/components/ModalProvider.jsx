import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const showAlert = (message) => {
    setAlertConfig({ message });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setConfirmConfig({
        message,
        onConfirm: () => {
          setConfirmConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmConfig(null);
          resolve(false);
        }
      });
    });
  };

  const closeAlert = () => {
    setAlertConfig(null);
  };

  // Inline styles matching the existing custom confirm modal in workbook
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  };

  const modalStyle = {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    textAlign: 'center'
  };

  const textStyle = {
    fontSize: '1rem',
    color: '#1c1c1e',
    marginBottom: '24px',
    lineHeight: '1.5'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  };

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    border: 'none',
    flex: 1
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    background: '#f2f2f7',
    color: '#007aff'
  };

  const okButtonStyle = {
    ...buttonStyle,
    background: '#007aff',
    color: '#fff'
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    background: '#ff3b30',
    color: '#fff'
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Alert Modal */}
      {alertConfig && (
        <div style={overlayStyle} onClick={closeAlert}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <p style={textStyle}>{alertConfig.message}</p>
            <div style={actionsStyle}>
              <button style={okButtonStyle} onClick={closeAlert}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <div style={overlayStyle} onClick={confirmConfig.onCancel}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <p style={textStyle}>{confirmConfig.message}</p>
            <div style={actionsStyle}>
              <button style={cancelButtonStyle} onClick={confirmConfig.onCancel}>Cancel</button>
              <button 
                style={confirmConfig.message.toLowerCase().includes('delete') ? deleteButtonStyle : okButtonStyle} 
                onClick={confirmConfig.onConfirm}
              >
                {confirmConfig.message.toLowerCase().includes('delete') ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
