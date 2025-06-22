import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Calendar, Star } from 'lucide-react';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useAuth } from '../../hooks/useAuth';
import { NavigationHeader } from '../common/NavigationHeader';

export const RevealScreen: React.FC = () => {
  const { user } = useAuth();
  const { sharedMovies } = useSharedMovies();
  const { dailyCycle } = useDailyCycle();
  const [phase, setPhase] = useState<'curtains' | 'popcorn' | 'reveal'>('curtains');

  useEffect(() => {
    // Phase 1: Close curtains (2 seconds)
    setTimeout(() => setPhase('popcorn'), 2000);
  }, []);

  useEffect(() => {
    if (phase === 'popcorn') {
      // Phase 2: Popcorn explosion (1 second)
      setTimeout(() => setPhase('reveal'), 1000);
    }
  }, [phase]);

  if (!dailyCycle) return null;

  const calculateWinner = () => {
    const scores: Record<string, number> = {};
    const allNominations = Object.values(dailyCycle.nominations).flat();
    const uniqueMovieIds = [...new Set(allNominations)];

    // Initialize scores
    uniqueMovieIds.forEach(movieId => {
      scores[movieId] = 0;
    });

    // Calculate votes
    Object.values(dailyCycle.votes).forEach(vote => {
      if (vote.top_pick) scores[vote.top_pick] = (scores[vote.top_pick] || 0) + 3;
      if (vote.second_pick) scores[vote.second_pick] = (scores[vote.second_pick] || 0) + 2;
      if (vote.third_pick) scores[vote.third_pick] = (scores[vote.third_pick] || 0) + 1;
    });

    // Apply underdog boost
    uniqueMovieIds.forEach(movieId => {
      const movie = sharedMovies.find(m => m.id === movieId);
      if (movie && movie.nomination_streak >= 5) {
        // Add 1 to each vote received (underdog boost)
        Object.values(dailyCycle.votes).forEach(vote => {
          if (vote.top_pick === movieId) scores[movieId] += 1;
          if (vote.second_pick === movieId) scores[movieId] += 1;
          if (vote.third_pick === movieId) scores[movieId] += 1;
        });
      }
    });

    // Find winner (highest score, then shortest runtime for ties)
    const sortedMovies = uniqueMovieIds
      .map(id => ({ id, score: scores[id], movie: sharedMovies.find(m => m.id === id) }))
      .filter(item => item.movie)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.movie?.runtime || 0) - (b.movie?.runtime || 0);
      });

    return sortedMovies[0];
  };

  const winner = calculateWinner();

  // If no winner found in shared movies, show a generic winner
  const displayWinner = winner || {
    id: dailyCycle.winning_movie?.movie_id || 'unknown',
    score: dailyCycle.winning_movie?.score || 0,
    movie: {
      title: 'Tonight\'s Selected Movie',
      poster_url: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400',
      release_year: new Date().getFullYear(),
      runtime: 120,
      nomination_streak: 0
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <NavigationHeader currentScreen="REVEAL" />
      
      {/* Theater Curtains */}
      <AnimatePresence>
        {phase === 'curtains' && (
          <>
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="fixed top-0 left-0 w-1/2 h-full bg-gradient-to-r from-red-800 to-red-600 z-40"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="fixed top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-800 to-red-600 z-40"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Popcorn Explosion */}
      <AnimatePresence>
        {phase === 'popcorn' && (
          <motion.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: [0, 1.5, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div className="text-8xl">🍿</div>
            {/* Popcorn particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{ 
                  scale: [0, 1, 0],
                  x: (Math.random() - 0.5) * 800,
                  y: (Math.random() - 0.5) * 600,
                }}
                transition={{ 
                  duration: 1,
                  delay: Math.random() * 0.3,
                  ease: 'easeOut'
                }}
                className="absolute text-2xl"
              >
                🍿
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring", stiffness: 100 }}
              className="max-w-4xl w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-6"
              >
                <Trophy className="h-10 w-10 text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-5xl font-bold text-white mb-8"
              >
                🎭 Tonight's Feature Presentation! 🎭
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 relative"
              >
                {/* Spotlight effect */}
                <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-transparent rounded-2xl"></div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
                  <motion.img
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    src={displayWinner.movie?.poster_url}
                    alt={displayWinner.movie?.title}
                    className="w-full max-w-sm mx-auto rounded-lg shadow-2xl border-4 border-yellow-400/50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400';
                    }}
                  />
                  
                  <div className="text-left">
                    <motion.h2
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 }}
                      className="text-4xl font-bold text-white mb-4"
                    >
                      {displayWinner.movie?.title}
                    </motion.h2>
                    
                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 }}
                      className="space-y-3 mb-6"
                    >
                      <div className="flex items-center space-x-3 text-white/90">
                        <Calendar className="h-5 w-5" />
                        <span className="text-lg">{displayWinner.movie?.release_year}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-white/90">
                        <Clock className="h-5 w-5" />
                        <span className="text-lg">{displayWinner.movie?.runtime} minutes</span>
                      </div>
                      <div className="flex items-center space-x-3 text-white/90">
                        <Star className="h-5 w-5 text-yellow-400" />
                        <span className="text-lg font-semibold">{displayWinner.score} points</span>
                      </div>
                    </motion.div>

                    {displayWinner.movie?.nomination_streak && displayWinner.movie.nomination_streak >= 5 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                        className="bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-lg inline-block mb-4"
                      >
                        🔥 Underdog Victory!
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7 }}
                className="text-white/80 text-lg mt-8"
              >
                🎬 Lights, Camera, Action! 🎬
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="mt-6 text-white/60 text-sm"
              >
                <p>The show must go on! Check the dashboard for your schedule.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Theater ambiance effects */}
      {phase === 'reveal' && (
        <>
          {/* Floating film strips */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100 }}
              animate={{ 
                opacity: [0, 0.3, 0],
                y: [-100, -200],
                rotate: [0, 360]
              }}
              transition={{
                duration: 4,
                delay: 2 + i * 0.5,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="fixed text-white/20 text-4xl"
              style={{
                left: `${20 + i * 15}%`,
                bottom: 0
              }}
            >
              🎞️
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
};