import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Remove loading screen after React loads
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('root-loading');
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.5s';
      setTimeout(() => loader.remove(), 500);
    }, 100);
  }
});