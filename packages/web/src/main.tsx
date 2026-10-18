import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { startColorModeSync } from './themes/colorMode';

const stopColorModeSync = startColorModeSync();
if (import.meta.hot) import.meta.hot.dispose(stopColorModeSync);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
