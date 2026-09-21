
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LocalLLMProvider } from './context/LocalLLMContext'; 
import { EchoProvider } from './context/EchoContext'; 
import { AppErrorBoundary } from './components/AppErrorBoundary'; 

// Safely ignore extension script & messaging noise
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || String(reason || '');
  const stack = reason?.stack || '';

  if (
    message.includes('Could not establish connection') ||
    message.includes('Receiving end does not exist') ||
    stack.includes('chrome-extension://') ||
    stack.includes('injectedScript')
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
        <LocalLLMProvider>
          <EchoProvider>
            <App />
          </EchoProvider>
        </LocalLLMProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);

