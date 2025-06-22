import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Film, Clock, Calendar, Check, AlertCircle, Star, MapPin, Tv } from 'lucide-react';
import { tmdbAPI, TMDBMovie } from '../../services/tmdbAPI';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useAuth } from '../../hooks/useAuth';
import { useAppConfig } from '../../hooks/useAppConfig';
import { NavigationHeader } from '../common/NavigationHeader';
import { NominationHeader } from '../common/NominationHeader';
import { LazyMovieCard } from '../common/LazyMovieCard';
import { StatusOverview } from '../common/StatusOverview';
import { MovieCarousel } from '../common/MovieCarousel';
import { CONSTANTS } from '../../constants';
import toast from 'react-hot-toast';

export const NominationScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { shareMovie } = useSharedMovies();
  const { dailyCycle, submitNominations } = useDailyCycle();
  const { config } = useAppConfig();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Movie data states
  const [trendingMovies, setTrendingMovies] = useState<TMDBMovie[]>([]);
  const [genreMovies, setGenreMovies] = useState<Record<string, TMDBMovie[]>>({});
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  
  // Loading states
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [genreLoading, setGenreLoading] = useState<Record<string, boolean>>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load trending movies on mount
  useEffect(() => {
    loadTrendingMovies();
    loadGenreMovies();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMovies(searchQuery);
      } else {
        setSearchResults([]);
        setSearchError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadTrendingMovies = async () => {
    try {
      setTrendingLoading(true);
      const response = await tmdbAPI.getTrendingMovies();
      setTrendingMovies(response.items);
    } catch (error) {
      console.error('Error loading trending movies:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadGenreMovies = async () => {
    for (const genre of CONSTANTS.POPULAR_GENRES.slice(0, 4)) { // Load first 4 genres
      try {
        setGenreLoading(prev => ({ ...prev, [genre.name]: true }));
        const response = await tmdbAPI.getMoviesByGenre(genre.id);
        setGenreMovies(prev => ({ ...prev, [genre.name]: response.items }));
      } catch (error) {
        console.error(`Error loading ${genre.name} movies:`, error);
      } finally {
        setGenreLoading(prev => ({ ...prev, [genre.name]: false }));
      }
    }
  };

  const searchMovies = async (query: string) => {
    try {
      setSearching(true);
      setSearchError(null);
      const response = await tmdbAPI.searchMovies(query);
      setSearchResults(response.items);
      
      if (response.items.length === 0) {
        setSearchError('No movies found on major streaming services. Try a different search term.');
      }
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchError('Failed to search movies. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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

  const handleSubmitNominations = async () => {
    try {
      setLoading(true);
      
      // Create temporary movie objects for sharing
      const allMovies = [
        ...trendingMovies,
        ...Object.values(genreMovies).flat(),
        ...searchResults
      ];
      
      // Share selected movies to the shared pool
      for (const movieId of selectedMovies) {
        const movie = allMovies.find(m => m.id.toString() === movieId);
        if (movie) {
          // Convert TMDBMovie to Movie format for sharing
          const movieForSharing = {
            id: movieId,
            title: movie.title,
            justwatch_id: movieId,
            poster_url: movie.poster || CONSTANTS.FALLBACK_POSTER_URL,
            runtime: movie.runtime || 120,
            release_year: movie.release_year || new Date().getFullYear(),
            genre_names: movie.genre_names || [],
            short_description: movie.short_description || '',
            nomination_streak: 0,
            added_at: new Date()
          };
          
          await shareMovie(movieForSharing, user!.id);
        }
      }
      
      // Submit nominations
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
    setSearchResults([]);
    setSearchError(null);
  };

  if (!user || !dailyCycle) return null;

  const hasSubmitted = user.id in dailyCycle.nominations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <NavigationHeader currentScreen="GATHERING_NOMINATIONS" />
      
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
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
            <p className="text-white/80">Select up to {CONSTANTS.MAX_NOMINATIONS_PER_USER} movies for tonight's vote</p>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <MapPin className="h-4 w-4 text-green-400" />
              <span className="text-green-400 text-sm">Showing movies available on major streaming services</span>
            </div>
          </motion.div>

          {!hasSubmitted ? (
            <>
              {/* Nomination Header */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 mb-6 sticky top-[80px] z-30">
                <NominationHeader
                  selectedMovies={selectedMovies}
                  maxSelections={CONSTANTS.MAX_NOMINATIONS_PER_USER}
                  onSubmit={handleSubmitNominations}
                  onNoNominations={handleNoNominations}
                  loading={loading}
                  hasSubmitted={hasSubmitted}
                />
              </div>

              {/* Search and Controls */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search Movies</span>
                  </button>
                </div>
                
                <div className="text-white/70">
                  {selectedMovies.length}/{CONSTANTS.MAX_NOMINATIONS_PER_USER} selected
                </div>
              </div>

              {/* Search Panel */}
              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">Search Movies on Major Streaming Services</h3>
                      <button
                        onClick={handleCloseSearch}
                        className="text-white/70 hover:text-white transition-colors"
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
                        placeholder="Search for movies..."
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

                    {/* Search Results */}
                    {searching && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-white/70">Searching...</p>
                      </div>
                    )}

                    {!searching && searchResults.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {searchResults.map((movie) => {
                          const movieId = movie.id.toString();
                          const isSelected = selectedMovies.includes(movieId);
                          
                          return (
                            <LazyMovieCard
                              key={movie.id}
                              movie={movie}
                              isSelected={isSelected}
                              onSelect={handleMovieSelect}
                              className="w-full h-auto"
                            />
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trending Movies Carousel */}
              <MovieCarousel
                title="🔥 Top 10 Trending This Week"
                movies={trendingMovies}
                selectedMovies={selectedMovies}
                onMovieSelect={handleMovieSelect}
                loading={trendingLoading}
              />

              {/* Genre Carousels */}
              {CONSTANTS.POPULAR_GENRES.slice(0, 4).map((genre) => (
                <MovieCarousel
                  key={genre.id}
                  title={`${genre.name} Movies`}
                  movies={genreMovies[genre.name] || []}
                  selectedMovies={selectedMovies}
                  onMovieSelect={handleMovieSelect}
                  loading={genreLoading[genre.name]}
                />
              ))}

              {/* Streaming Provider Buttons */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Browse by Streaming Service</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {CONSTANTS.STREAMING_PROVIDERS.map((provider) => (
                    <motion.button
                      key={provider.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/provider/${provider.id}`)}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl p-6 text-center transition-all duration-200 border border-white/20"
                    >
                      <div className="text-4xl mb-2">{provider.logo}</div>
                      <div className="text-white font-semibold text-sm">{provider.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              {/* Submit buttons are now in the sticky header */}
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