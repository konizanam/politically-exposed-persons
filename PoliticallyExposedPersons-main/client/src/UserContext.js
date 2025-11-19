import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

function getTokenExpiration(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) return payload.exp * 1000; // ms
  } catch {}
  return null;
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // Inactivity timer
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login?expired=1';
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Listen for user activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('touchmove', resetTimer);

    resetTimer(); // Start timer

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('touchmove', resetTimer);
    };
  }, []);

  // Token expiry check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const exp = getTokenExpiration(token);
    if (exp && Date.now() > exp) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login?expired=1';
    }
    setLoading(false); // ✅ done initializing
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {!loading && children} {/* ✅ prevents premature redirects */}
    </UserContext.Provider>
  );
}
