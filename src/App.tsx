import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { useDailyCycle } from './hooks/useDailyCycle';
import { LoginForm } from './components/auth/LoginForm';
import { DecisionScreen } from './components/screens/DecisionScreen';
import { NominationScreen } from './components/screens/NominationScreen';
import { VotingScreen } from './components/screens/VotingScreen';
import { RevealScreen } from './components/screens/RevealScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { StreamingProviderScreen } from './components/screens/StreamingProviderScreen';
import { ScrollToTop } from './components/common/ScrollToTop';
import { CONSTANTS } from './constants';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { dailyCycle, loading: cycleLoading } = useDailyCycle();
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);

  // Individual reveal tracking using localStorage
  const [hasSeenReveal, setHasSeenReveal] = useState(false);

  useEffect(() => {
    if (dailyCycle) {
      const today = dailyCycle.id;
      const lastRevealSeen = localStorage.getItem('lastRevealSeen');
      setHasSeenReveal(lastRevealSeen === today);
    }
  }, [dailyCycle]);

  const markRevealAsSeen = () => {
    if (dailyCycle) {
      localStorage.setItem('lastRevealSeen', dailyCycle.id);
      setHasSeenReveal(true);
    }
  };

  const handleMovieSelect = (movieId: string) => {
    setSelectedMovies(prev => {
      if (prev.includes(movieId)) {
        return prev.filter(id => id !== movieId);
      } else if (prev.length < CONSTANTS.MAX_NOMINATIONS_PER_USER) {
        return [...prev, movieId];
      } else {
        return prev;
      }
    });
  };

  // Show loading while checking authentication
  if (authLoading || cycleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Force login if no user is authenticated
  if (!user) {
    return (
      <Router>
        <ScrollToTop />
        <LoginForm />
        <Toaster position="top-right" />
      </Router>
    );
  }

  const getCurrentScreen = () => {
    if (!dailyCycle) return <DecisionScreen />;

    switch (dailyCycle.current_status) {
      case 'WAITING_FOR_DECISIONS':
        return <DecisionScreen />;
      case 'GATHERING_NOMINATIONS':
        return <NominationScreen />;
      case 'GATHERING_VOTES':
        return <VotingScreen />;
      case 'REVEAL':
        return !hasSeenReveal ? <RevealScreen onRevealComplete={markRevealAsSeen} /> : <DashboardScreen />;
      case 'DASHBOARD_VIEW':
        return <DashboardScreen />;
      default:
        return <DecisionScreen />;
    }
  };

  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Routes>
          {/* Main app flow */}
          <Route path="/" element={getCurrentScreen()} />
          <Route path="/nominations" element={<NominationScreen />} />
          
          {/* Streaming provider pages */}
          <Route 
            path="/provider/:providerId" 
            element={
              <StreamingProviderScreen 
                selectedMovies={selectedMovies}
                onMovieSelect={handleMovieSelect}
                maxSelections={CONSTANTS.MAX_NOMINATIONS_PER_USER}
              />
            } 
          />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;