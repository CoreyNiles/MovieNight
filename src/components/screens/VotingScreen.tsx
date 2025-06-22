import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Calendar, Users, Check } from 'lucide-react';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useMovieLibrary } from '../../hooks/useMovieLibrary';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useAuth } from '../../hooks/useAuth';
import { NavigationHeader } from '../common/NavigationHeader';
import { StatusOverview } from '../common/StatusOverview';
import toast from 'react-hot-toast';

export const VotingScreen: React.FC = () => {
  const { user } = useAuth();
  const { movies } = useMovieLibrary(user?.id || '');
  const { sharedMovies, shareMovie } = useSharedMovies();
  const { dailyCycle, submitVote } = useDailyCycle();
  
  const [votes, setVotes] = useState({
    top_pick: '',
    second_pick: '',
    third_pick: ''
  });
  const [loading, setLoading] = useState(false);

  // Share nominated movies when component loads
  useEffect(() => {
    const shareNominatedMovies = async () => {
      if (!dailyCycle || !user) return;

      const allNominations = Object.values(dailyCycle.nominations).flat();
      const uniqueMovieIds = [...new Set(allNominations)];

      // Share each nominated movie from user's library
      for (const movieId of uniqueMovieIds) {
        const movie = movies.find(m => m.id === movieId);
        if (movie) {
          try {
            await shareMovie(movie, user.id);
          } catch (error) {
            console.error('Error sharing movie:', error);
          }
        }
      }
    };

    shareNominatedMovies();
  }, [dailyCycle, movies, user, shareMovie]);

  const nominatedMovies = useMemo(() => {
    if (!dailyCycle) return [];
    
    const allNominations = Object.values(dailyCycle.nominations).flat();
    const uniqueMovieIds = [...new Set(allNominations)];
    
    // Get movies from shared pool that match nominated IDs
    return sharedMovies.filter(movie => uniqueMovieIds.includes(movie.id));
  }, [sharedMovies, dailyCycle]);

  const handleVoteChange = (position: keyof typeof votes, movieId: string) => {
    setVotes(prev => ({
      ...prev,
      [position]: movieId
    }));
  };

  const handleSubmitVote = async () => {
    const requiredPicks = Math.min(3, nominatedMovies.length);
    const currentPicks = [votes.top_pick, votes.second_pick, votes.third_pick].filter(Boolean);
    
    if (currentPicks.length < requiredPicks) {
      toast.error(`Please select ${requiredPicks} movie${requiredPicks > 1 ? 's' : ''}`);
      return;
    }

    const voteValues = [votes.top_pick, votes.second_pick, votes.third_pick].filter(Boolean);
    const uniqueVotes = new Set(voteValues);
    if (uniqueVotes.size !== voteValues.length) {
      toast.error('You cannot vote for the same movie multiple times');
      return;
    }

    try {
      setLoading(true);
      await submitVote(user!.id, votes);
      toast.success('Vote submitted!');
    } catch (error) {
      toast.error('Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !dailyCycle) return null;

  const hasVoted = user.id in dailyCycle.votes;
  const allVotes = Object.keys(dailyCycle.votes).length;
  const totalUsers = Object.keys(dailyCycle.decisions).filter(userId => dailyCycle.decisions[userId]).length;

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <NavigationHeader currentScreen="GATHERING_VOTES" />
        
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Vote Submitted!</h2>
            <p className="text-white/80 mb-6">
              Waiting for {totalUsers - allVotes} more vote{totalUsers - allVotes > 1 ? 's' : ''}...
            </p>
            
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Your Votes:</h3>
              <div className="space-y-2">
                {[
                  { key: 'top_pick', label: '1st Choice', points: 3 },
                  { key: 'second_pick', label: '2nd Choice', points: 2 },
                  { key: 'third_pick', label: '3rd Choice', points: 1 }
                ].map(({ key, label, points }) => {
                  const movieId = dailyCycle.votes[user.id][key as keyof typeof votes];
                  const movie = sharedMovies.find(m => m.id === movieId);
                  return movieId ? (
                    <div key={key} className="flex items-center justify-between bg-white/5 p-3 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                          {points}
                        </div>
                        <span className="text-white">{label}</span>
                      </div>
                      <span className="text-white font-medium">
                        {movie ? movie.title : `Movie ID: ${movieId.slice(0, 8)}...`}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="mt-6 text-white/70 text-sm">
              <p>Use the navigation above to check other screens!</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show message if no movies were nominated
  if (nominatedMovies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <NavigationHeader currentScreen="GATHERING_VOTES" />
        
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto text-center"
          >
            <Trophy className="h-16 w-16 text-white/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Loading Nominated Movies...</h2>
            <p className="text-white/80 mb-6">
              We're gathering all the nominated movies for voting. This should only take a moment.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <NavigationHeader currentScreen="GATHERING_VOTES" />
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <StatusOverview />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Time to Vote!</h1>
            <p className="text-white/80">Rank the nominated movies in order of preference</p>
            <p className="text-white/60 text-sm mt-2">
              {nominatedMovies.length} movies available to vote on
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Nominated Movies</h2>
              <div className="space-y-4">
                {nominatedMovies.map((movie) => (
                  <motion.div
                    key={movie.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/10 backdrop-blur-lg rounded-lg p-4 flex items-center space-x-4"
                  >
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">{movie.title}</h3>
                      <div className="flex items-center space-x-4 text-white/70 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{movie.release_year}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{movie.runtime}m</span>
                        </div>
                      </div>
                      {movie.nomination_streak >= 5 && (
                        <div className="mt-2 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs inline-block">
                          🔥 Underdog Boost!
                        </div>
                      )}
                      <div className="mt-1 text-white/50 text-xs">
                        Nominated by: {movie.original_owner === user.id ? 'You' : 'Another user'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Your Rankings</h2>
              <div className="space-y-4">
                {[
                  { key: 'top_pick', label: '1st Choice', position: 1, points: 3, color: 'from-yellow-500 to-orange-500' },
                  { key: 'second_pick', label: '2nd Choice', position: 2, points: 2, color: 'from-gray-400 to-gray-500' },
                  { key: 'third_pick', label: '3rd Choice', position: 3, points: 1, color: 'from-amber-600 to-amber-700' }
                ].map(({ key, label, position, points, color }) => {
                  const isDisabled = position > nominatedMovies.length;
                  
                  return (
                    <div key={key} className={`bg-white/10 backdrop-blur-lg rounded-lg p-4 ${isDisabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`bg-gradient-to-r ${color} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold ${isDisabled ? 'opacity-50' : ''}`}>
                            {position}
                          </div>
                          <div>
                            <span className="text-white font-semibold">{label}</span>
                            <div className="text-white/60 text-sm">{points} points</div>
                          </div>
                        </div>
                        {isDisabled && (
                          <span className="text-white/50 text-sm">Not enough movies</span>
                        )}
                      </div>
                      
                      <select
                        value={votes[key as keyof typeof votes]}
                        onChange={(e) => handleVoteChange(key as keyof typeof votes, e.target.value)}
                        disabled={isDisabled}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">{isDisabled ? 'Not available' : 'Select a movie...'}</option>
                        {!isDisabled && nominatedMovies.map((movie) => (
                          <option key={movie.id} value={movie.id} className="bg-gray-800">
                            {movie.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitVote}
                disabled={loading || (nominatedMovies.length >= 1 && !votes.top_pick) || (nominatedMovies.length >= 2 && !votes.second_pick) || (nominatedMovies.length >= 3 && !votes.third_pick)}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : `Submit Vote (${Math.min(3, nominatedMovies.length)} required)`}
              </motion.button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 bg-white/5 backdrop-blur-lg rounded-lg p-4 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-white/80">
              <Users className="h-5 w-5" />
              <span>Votes received: {allVotes}/{totalUsers}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};