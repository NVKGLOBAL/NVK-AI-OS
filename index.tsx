
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { GeminiProvider } from './context/GeminiIntegrationContext'; // Import GeminiProvider
import { LocalLLMProvider } from './context/LocalLLMContext'; // Import LocalLLMProvider
import { EchoProvider } from './context/EchoContext'; // Import EchoProvider
import { AppErrorBoundary } from './components/AppErrorBoundary'; // Import AppErrorBoundary

// Safely ignore extension script & messaging noise (e.g. "Could not establish connection. Receiving end does not exist.")
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
      <GeminiProvider> 
        <LocalLLMProvider> {/* Wrap App with LocalLLMProvider for shared WebGPU context */}
          <EchoProvider>
            <App />
          </EchoProvider>
        </LocalLLMProvider>
      </GeminiProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);

