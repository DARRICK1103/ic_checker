// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import FormPage from './pages/PartyForm';
import AuthProvider from './AuthProvider'; // ✅ import it

function App() {
  return (
    <AuthProvider> {/* ✅ wrap everything inside */}
      <Router>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/form/:slug" element={<FormPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
