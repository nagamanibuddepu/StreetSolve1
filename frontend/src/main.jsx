import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{
          duration: 3500,
          style: { fontFamily: 'Sora, sans-serif', fontSize: '13px', background: '#0D1B3E', color: 'white', borderLeft: '4px solid #FF6B2B' },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
