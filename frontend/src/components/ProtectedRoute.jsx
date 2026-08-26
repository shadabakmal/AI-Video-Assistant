import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, user }) {
  const token = localStorage.getItem('token');
  if (!token && !user) {
    return <Navigate to="/" replace />;
  }
  return children;
}
