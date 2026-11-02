import React from 'react';
import { createRoot } from 'react-dom/client';
import '@tingting/design-system/tokens.css';
import '@tingting/design-system/global.css';
import App from './App';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
