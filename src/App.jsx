import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LogInPage from './pages/LogInPage'
import Home from './pages/Home'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login/Sign Up page */}
        <Route path="/login" element={<LogInPage />} />
        
        {/* Protected Home page */}
        <Route path="/home" element={<Home />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App