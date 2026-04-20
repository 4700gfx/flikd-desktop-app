import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider }    from '../src/context/AuthContext'
import ProtectedRoute      from '../src/context/ProtectedRoutes'
import LogInPage           from './pages/LogInPage'
import ResetPasswordPage   from './pages/ResetPasswordPage'
import Home                from './pages/Home'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Root → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public: login / sign-up */}
          <Route path="/login" element={<LogInPage />} />

          {/*
            Public: password-reset landing page.
            Supabase redirects here after the user clicks the
            link in their reset email. The page validates the
            recovery token itself — no auth guard needed.
          */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected: home feed */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App