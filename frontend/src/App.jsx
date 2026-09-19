import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AlertProvider } from './context/AlertContext';
import { ResourceProvider } from './context/ResourceContext';
import { IncidentProvider } from './context/IncidentContext';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <SocketProvider>
      <AlertProvider>
        <ResourceProvider>
          <IncidentProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </IncidentProvider>
        </ResourceProvider>
      </AlertProvider>
    </SocketProvider>
  );
}
