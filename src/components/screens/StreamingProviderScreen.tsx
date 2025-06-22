import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, SlidersHorizontal, Check, Star, Calendar, Clock, MapPin, Tv } from 'lucide-react';
import { tmdbAPI, TMDBMovie, FilterOptions } from '../../services/tmdbAPI';
import { CONSTANTS } from '../../constants';
import toast from 'react-hot-toast';

interface StreamingProviderScreenProps {
  selectedMovies: string[];
  onMovieSelect: (movieId: string) => void;
  maxSelections: number;
}

export const StreamingProviderScreen: React.FC<StreamingProviderScreenProps> = ({
  selectedMovies,
  onMovieSelect,
  maxSelections
}) => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filters, setFilters] = useState<FilterOptions>({
    year_range: { min: 1990, max: new Date().getFullYear() },
    genres: [],
    min_rating: 0,
    sort_by: 'popularity.desc'
  });

  const provider = CONSTANTS.STREAMING_PROVIDERS.find(p => p.id.toString() === providerId);

  useEffect(() => {
    if (providerId) {
      loadMovies();
    }
  }, [providerId, filters, currentPage]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const response = await tmdbAPI.getMoviesByProvider(
        parseInt(providerId!),
        filters,
        currentPage
      );
      
      if (currentPage === 1) {
        setMovies(response.items);
      } else {
        setMovies(prev => [...prev, ...response.items]);
      }
      
      setTotalPages(response.total_pages);
    } catch (error) {
      toast.error('Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  const handleMovieSelect = (movieId: string) => {
    if (selectedMovies.includes(movieId)) {
      onMovieSelect(movieId);
      return;
    }
    
    if (selectedMovies.length >= maxSelections) {
      toast.error(`You can only select up to ${maxSelections} movies`);
      return;
    }
    
    onMovieSelect(movieId);
    toast.success('Movie selected for nomination!');
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const loadMore = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Provider not found</h1>
          <button
            onClick={() => navigate('/nominations')}
            className="bg-purple-500 hover:bg-purple-600 px-6 py-2 rounded-lg transition-colors"
          >
            Back to Nominations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/nominations')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{provider.logo}</span>
                <div>
                  <h1 className="text-3xl font-bold text-white">{provider.name}</h1>
                  <p className="text-white/70">Movies available in Canada</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Year Range */}
                <div>
                  <label className="block text-white font-medium mb-2">Release Year</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1990"
                      max={new Date().getFullYear()}
                      value={filters.year_range?.min || 1990}
                      onChange={(e) => handleFilterChange({
                        year_range: { ...filters.year_range!, min: parseInt(e.target.value) }
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-white/70 text-sm">
                      <span>{filters.year_range?.min}</span>
                      <span>{filters.year_range?.max}</span>
                    </div>
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-white font-medium mb-2">Genres</label>
                  <select
                    multiple
                    value={filters.genres?.map(String) || []}
                    onChange={(e) => {
                      const selectedGenres = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                      handleFilterChange({ genres: selectedGenres });
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {CONSTANTS.POPULAR_GENRES.map(genre => (
                      <option key={genre.id} value={genre.id} className="bg-gray-800">
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-white font-medium mb-2">Min Rating</label>
                  <select
                    value={filters.min_rating || 0}
                    onChange={(e) => handleFilterChange({ min_rating: parseFloat(e.target.value) })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={6}>6.0+</option>
                    <option value={7}>7.0+</option>
                    <option value={8}>8.0+</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-white font-medium mb-2">Sort By</label>
                  <select
                    value={filters.sort_by || 'popularity.desc'}
                    onChange={(e) => handleFilterChange({ sort_by: e.target.value as FilterOptions['sort_by'] })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="popularity.desc">Most Popular</option>
                    <option value="release_date.desc">Newest First</option>
                    <option value="vote_average.desc">Highest Rated</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Selection Counter */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-lg">
              <span className="text-white/80">Selected:</span>
              <span className="text-white font-semibold">{selectedMovies.length}/{maxSelections}</span>
            </div>
          </div>

          {/* Movies Grid */}
          {loading && currentPage === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white/10 rounded-xl h-96 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {movies.map((movie) => {
                  const movieId = movie.id.toString();
                  const isSelected = selectedMovies.includes(movieId);
                  
                  return (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMovieSelect(movieId)}
                      className={`relative bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/25'
                          : 'hover:bg-white/20'
                      }`}
                    >
                      <img
                        src={movie.poster || CONSTANTS.FALLBACK_POSTER_URL}
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
                          {movie.runtime && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{movie.runtime}m</span>
                            </div>
                          )}
                        </div>
                        
                        {movie.vote_average && (
                          <div className="flex items-center space-x-1 text-yellow-400 text-sm mb-2">
                            <Star className="h-4 w-4 fill-current" />
                            <span>{movie.vote_average.toFixed(1)}</span>
                          </div>
                        )}

                        {movie.genre_names && movie.genre_names.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {movie.genre_names.slice(0, 3).map((genre) => (
                              <span key={genre} className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center space-x-1 text-green-400 text-xs">
                          <Tv className="h-3 w-3" />
                          <span>Available on {provider.name}</span>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white p-2 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {currentPage < totalPages && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More Movies'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};