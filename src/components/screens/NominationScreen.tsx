import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Film, Clock, Calendar, Check, AlertCircle, Star, MapPin, Tv } from 'lucide-react';
import { useMovieLibrary } from '../../hooks/useMovieLibrary';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useAuth } from '../../hooks/useAuth';
import { NavigationHeader } from '../common/NavigationHeader';
import { StatusOverview } from '../common/StatusOverview';
import { CONSTANTS } from '../../constants';
import toast from 'react-hot-toast';

export const NominationScreen: React.FC = () => {
  const { user } = useAuth();
  const { movies, searchResults, searching, searchError, searchMoviesAPI, addMovieToLibrary, clearSearchResults } = useMovieLibrary(user?.id || '');
  const { shareMovie } = useSharedMovies();
  const { dailyCycle, submitNominations } = useDailyCycle();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMoviesAPI(searchQuery);
      } else {
        clearSearchResults();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedMovieDetails = useMemo(() => {
    return movies.filter(movie => selectedMovies.includes(movie.id));
  }, [movies, selectedMovies]);

  const handleMovieSelect = (movieId: string) => {
    setSelectedMovies(prev => {
      if (prev.includes(movieId)) {
        return prev.filter(id => id !== movieId);
      } else if (prev.length < CONSTANTS.MAX_NOMINATIONS_PER_USER) {
        return [...prev, movieId];
      } else {
        toast.error(`You can only select up to ${CONSTANTS.MAX_NOMINATIONS_PER_USER} movies`);
        return prev;
      }
    });
  };

  const handleAddMovie = async (justWatchId: string) => {
    try {
      setLoading(true);
      await addMovieToLibrary(justWatchId);
      toast.success('Movie added to your library!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add movie');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNominations = async () => {
    try {
      setLoading(true);
      
      // First, share all selected movies to the shared pool
      for (const movieId of selectedMovies) {
        const movie = movies.find(m => m.id === movieId);
        if (movie) {
          await shareMovie(movie, user!.id);
        }
      }
      
      // Then submit nominations
      await submitNominations(user!.id, selectedMovies);
      toast.success('Nominations submitted!');
    } catch (error) {
      toast.error('Failed to submit nominations');
    } finally {
      setLoading(false);
    }
  };

  const handleNoNominations = async () => {
    try {
      setLoading(true);
      await submitNominations(user!.id, []);
      toast.success('Noted - no nominations from you tonight');
    } catch (error) {
      toast.error('Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    clearSearchResults();
  };

  if (!user || !dailyCycle) return null;

  const hasSubmitted = user.id in dailyCycle.nominations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <NavigationHeader currentScreen="GATHERING_NOMINATIONS" />
      
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <StatusOverview />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
              <Film className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Choose Your Nominations</h1>
            <p className="text-white/80">Select up to {CONSTANTS.MAX_NOMINATIONS_PER_USER} movies from your library for tonight's vote</p>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <MapPin className="h-4 w-4 text-green-400" />
              <span className="text-green-400 text-sm">Showing movies available in Canada</span>
            </div>
          </motion.div>

          {!hasSubmitted ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    aria-label="Search for movies"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search Movies</span>
                  </button>
                  
                  {movies.length === 0 && (
                    <div className="flex items-center space-x-2 text-yellow-300 bg-yellow-500/20 px-3 py-2 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Add movies to your library first</span>
                    </div>
                  )}
                </div>
                
                <div className="text-white/70">
                  {selectedMovies.length}/{CONSTANTS.MAX_NOMINATIONS_PER_USER} selected
                </div>
              </div>

              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">Search Movies Available in Canada</h3>
                      <button
                        onClick={handleCloseSearch}
                        className="text-white/70 hover:text-white transition-colors"
                        aria-label="Close search panel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for movies (e.g., 'Inception', 'Marvel', 'Comedy')..."
                        className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {searchError && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center space-x-2 text-red-300">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{searchError}</span>
                        </div>
                      </div>
                    )}

                    {searching && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-white/70">Searching for "{searchQuery}"...</p>
                      </div>
                    )}

                    {!searching && searchResults.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {searchResults.map((movie) => (
                          <motion.div
                            key={movie.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex space-x-3">
                              <img
                                src={movie.poster || CONSTANTS.FALLBACK_POSTER_URL}
                                alt={movie.title}
                                className="w-16 h-24 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = CONSTANTS.FALLBACK_POSTER_URL;
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium text-sm mb-1 truncate">{movie.title}</h3>
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2 text-white/70 text-xs">
                                    <Calendar className="h-3 w-3" />
                                    <span>{movie.release_year}</span>
                                  </div>
                                  {movie.runtime && (
                                    <div className="flex items-center space-x-2 text-white/70 text-xs">
                                      <Clock className="h-3 w-3" />
                                      <span>{movie.runtime} min</span>
                                    </div>
                                  )}
                                  {movie.available_in_canada && (
                                    <div className="flex items-center space-x-1 text-green-400 text-xs">
                                      <MapPin className="h-3 w-3" />
                                      <span>Available in Canada</span>
                                    </div>
                                  )}
                                  {movie.streaming_providers && movie.streaming_providers.length > 0 && (
                                    <div className="flex items-center space-x-1 text-blue-400 text-xs">
                                      <Tv className="h-3 w-3" />
                                      <span>{movie.streaming_providers.slice(0, 2).join(', ')}</span>
                                    </div>
                                  )}
                                  {movie.genre_names && movie.genre_names.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {movie.genre_names.slice(0, 2).map((genre) => (
                                        <span key={genre} className="bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded text-xs">
                                          {genre}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleAddMovie(movie.id.toString())}
                                  disabled={loading}
                                  className="mt-2 w-full bg-purple-500 hover:bg-purple-600 text-white py-1 px-2 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {loading ? 'Adding...' : 'Add to Library'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {!searching && searchQuery && searchResults.length === 0 && !searchError && (
                      <div className="text-center py-8">
                        <Film className="h-12 w-12 text-white/30 mx-auto mb-2" />
                        <p className="text-white/70">No movies found for "{searchQuery}"</p>
                        <p className="text-white/50 text-sm mt-1">Try a different search term</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {movies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {movies.map((movie) => (
                    <motion.div
                      key={movie.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMovieSelect(movie.id)}
                      className={`relative bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        selectedMovies.includes(movie.id)
                          ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/25'
                          : 'hover:bg-white/20'
                      }`}
                    >
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-80 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = CONSTANTS.FALLBACK_POSTER_URL;
                        }}
                      />
                      <div className="p-4">
                        <h3 className="text-white font-semibold mb-2 line-clamp-2">{movie.title}</h3>
                        <div className="flex items-center justify-between text-white/70 text-sm mb-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{movie.release_year}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{movie.runtime}m</span>
                          </div>
                        </div>
                        
                        {movie.genre_names && movie.genre_names.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {movie.genre_names.slice(0, 3).map((genre) => (
                              <span key={genre} className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {movie.nomination_streak > 0 && (
                          <div className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">
                            <Star className="h-3 w-3" />
                            <span>Streak: {movie.nomination_streak}</span>
                          </div>
                        )}
                      </div>
                      
                      {selectedMovies.includes(movie.id) && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white p-2 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Film className="h-16 w-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Movies in Your Library</h3>
                  <p className="text-white/70 mb-6">Search and add movies to get started with nominations</p>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Search Movies
                  </button>
                </div>
              )}

              {movies.length > 0 && (
                <div className="flex justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitNominations}
                    disabled={loading || selectedMovies.length === 0}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : `Submit Nominations (${selectedMovies.length})`}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNoNominations}
                    disabled={loading}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold border border-white/20 transition-all duration-200"
                  >
                    {loading ? 'Submitting...' : 'No Nominations'}
                  </motion.button>
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Nominations Submitted!</h2>
                <p className="text-white/80 mb-6">
                  {dailyCycle.nominations[user.id]?.length > 0
                    ? `You nominated ${dailyCycle.nominations[user.id].length} movie${dailyCycle.nominations[user.id].length > 1 ? 's' : ''}`
                    : "You chose not to nominate any movies"
                  }
                </p>
                
                {selectedMovieDetails.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {selectedMovieDetails.map((movie) => (
                      <div key={movie.id} className="bg-white/5 rounded-lg p-3">
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-full h-32 object-cover rounded mb-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = CONSTANTS.FALLBACK_POSTER_URL;
                          }}
                        />
                        <h4 className="text-white text-sm font-medium">{movie.title}</h4>
                        <p className="text-white/70 text-xs">{movie.release_year} • {movie.runtime}min</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 text-white/70 text-sm">
                  <p>Waiting for others to submit their nominations...</p>
                  <p className="mt-2">Use the navigation above to check other screens!</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};