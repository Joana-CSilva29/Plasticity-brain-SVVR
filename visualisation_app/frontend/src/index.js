import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { CssBaseline } from '@mui/material';
import { VTKProvider } from './context/VTKContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CssBaseline />
    <VTKProvider>
      <App />
    </VTKProvider>
  </React.StrictMode>
); 