import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './UserContext';  // ✅ Import context provider
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <UserProvider>       {/* ✅ Wrap App with context */}
      <App />
    </UserProvider>
  </React.StrictMode>
);
