declare global {
  interface Window {
    VITE_STATUS?: string;
  }
}

window.VITE_STATUS = 'EXECUTING_ENTRY';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  window.VITE_STATUS = 'ROOT_NOT_FOUND';
}
