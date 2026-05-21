import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

reportWebVitals();

if (typeof window !== 'undefined') {
  window.__OOH_REPORT_ERROR__ = (error, info) => {
    // Plug Sentry / Logtail here once configured.
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== 'production') console.error('[boundary]', error, info);
  };
}
