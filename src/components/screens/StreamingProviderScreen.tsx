import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Star, Calendar, Clock, Tv } from 'lucide-react';
import { tmdbAPI, TMDBMovie, FilterOptions } from '../../services/tmdbAPI';
import { MovieCarousel } from '../common/MovieCarousel';
import { NominationHeader } from '../common/NominationHeader';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useAuth } from '../../hooks/useAuth';
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
  const { user } = useAuth();
  const { shareMovie } = useSharedMovies();
  const { dailyCycle, submitNominations } = useDailyCycle();
  
  const [trendingMovies, setTrendingMovies] = useState<TMDBMovie[]>([]);
  const [genreMovies, setGenreMovies] = useState<Record<string, TMDBMovie[]>>({});
  const [filteredMovies, setFilteredMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    decade: undefined,
    genres: [],
    min_rating: 0,
    sort_by: 'popularity.desc'
  });

  const provider = CONSTANTS.STREAMING_PROVIDERS.find(p => p.id.toString() === providerId);

  const hasSubmitted = user && dailyCycle ? user.id in dailyCycle.nominations : false;

  useEffect(() => {
    if (providerId) {
      loadProviderContent();
    }
  }, [providerId]);

  useEffect(() => {
    if (showFilters) {
      loadFilteredMovies();
    }
  }, [filters, currentPage, showFilters]);

  const loadProviderContent = async () => {
    try {
      setLoading(true);
      
      // Load trending movies for this provider
      const trendingResponse = await tmdbAPI.getMoviesByProvider(parseInt(providerId!), { sort_by: 'popularity.desc' });
      setTrendingMovies(trendingResponse.items.slice(0, 10));
      
      // Load genre-specific carousels
      const genreData: Record<string, TMDBMovie[]> = {};
      for (const genre of CONSTANTS.POPULAR_GENRES.slice(0, 4)) {
        const genreResponse = await tmdbAPI.getMoviesByProvider(
          parseInt(providerId!), 
          { genres: [genre.id] }
        );
        genreData[genre.name] = genreResponse.items.slice(0, 20);
      }
      setGenreMovies(genreData);
      
    } catch (error) {
      toast.error('Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredMovies = async () => {
    try {
      const response = await tmdbAPI.getMoviesByProvider(
        parseInt(providerId!),
        filters,
        currentPage
      );
      
      if (currentPage === 1) {
        setFilteredMovies(response.items);
      } else {
        setFilteredMovies(prev => [...prev, ...response.items]);
      }
      
      setTotalPages(response.total_pages);
    } catch (error) {
      toast.error('Failed to load filtered movies');
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
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSubmitNominations = async () => {
    if (!user || !dailyCycle) return;
    
    try {
      setIsSubmitting(true);
      
      // Create temporary movie objects for sharing
      const allMovies = [
        ...trendingMovies,
        ...Object.values(genreMovies).flat(),
        ...filteredMovies
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
          
          await shareMovie(movieForSharing, user.id);
        }
      }
      
      // Submit nominations
      await submitNominations(user.id, selectedMovies);
      toast.success('Nominations submitted!');
    } catch (error) {
      toast.error('Failed to submit nominations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoNominations = async () => {
    if (!user || !dailyCycle) return;
    
    try {
      setIsSubmitting(true);
      await submitNominations(user.id, []);
      toast.success('Noted - no nominations from you tonight');
    } catch (error) {
      toast.error('Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/nominations')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Back to nominations"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{provider.logo}</span>
                <div>
                  <h1 className="text-3xl font-bold text-white">{provider.name}</h1>
                  <p className="text-white/70">Movies available on major streaming services</p>
                </div>
              </div>
            </div>
            
            <div className="text-white/70">
              {selectedMovies.length}/{maxSelections} selected
            </div>
          </div>

          {/* Nomination Header - After the main header */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 mb-6 sticky top-[80px] z-30">
            <NominationHeader
              selectedMovies={selectedMovies}
              maxSelections={maxSelections}
              onSubmit={handleSubmitNominations}
              onNoNominations={handleNoNominations}
              loading={isSubmitting}
              hasSubmitted={hasSubmitted}
            />
          </div>

          {/* Netflix-style carousels */}
          {!showFilters && (
            <>
              <MovieCarousel
                title={`🔥 Trending on ${provider.name}`}
                movies={trendingMovies}
                selectedMovies={selectedMovies}
                onMovieSelect={handleMovieSelect}
                loading={loading}
              />

              {CONSTANTS.POPULAR_GENRES.slice(0, 4).map((genre) => (
                <MovieCarousel
                  key={genre.id}
                  title={`${genre.name} on ${provider.name}`}
                  movies={genreMovies[genre.name] || []}
                  selectedMovies={selectedMovies}
                  onMovieSelect={handleMovieSelect}
                  loading={loading}
                />
              ))}
            </>
          )}

          {/* Advanced Filters Toggle */}
          <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg transition-colors text-white font-semibold"
            >
              {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
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
                {/* Decade Filter */}
                <div>
                  <label className="block text-white font-medium mb-3">Release Decade</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleFilterChange({ decade: undefined })}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        !filters.decade 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      All
                    </button>
                    {tmdbAPI.getAvailableDecades().map(decade => (
                      <button
                        key={decade}
                        onClick={() => handleFilterChange({ decade: decade.replace('s', '') })}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          filters.decade === decade.replace('s', '')
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        {decade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genres Filter */}
                <div>
                  <label className="block text-white font-medium mb-3">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {CONSTANTS.POPULAR_GENRES.map(genre => (
                      <button
                        key={genre.id}
                        onClick={() => {
                          const currentGenres = filters.genres || [];
                          const newGenres = currentGenres.includes(genre.id)
                            ? currentGenres.filter(id => id !== genre.id)
                            : [...currentGenres, genre.id];
                          handleFilterChange({ genres: newGenres });
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          filters.genres?.includes(genre.id)
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-white font-medium mb-3">Minimum Rating</label>
                  <div className="space-y-2">
                    {[
                      { value: 0, label: 'Any Rating' },
                      { value: 6, label: '6.0+' },
                      { value: 7, label: '7.0+' },
                      { value: 8, label: '8.0+' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center space-x-2 text-white/80">
                        <input
                          type="radio"
                          name="rating"
                          value={option.value}
                          checked={filters.min_rating === option.value}
                          onChange={() => handleFilterChange({ min_rating: option.value })}
                          className="text-purple-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort By Filter */}
                <div>
                  <label className="block text-white font-medium mb-3">Sort By</label>
                  <div className="space-y-2">
                    {[
                      { value: 'popularity.desc', label: 'Most Popular' },
                      { value: 'release_date.desc', label: 'Newest First' },
                      { value: 'vote_average.desc', label: 'Highest Rated' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center space-x-2 text-white/80">
                        <input
                          type="radio"
                          name="sort"
                          value={option.value}
                          checked={filters.sort_by === option.value}
                          onChange={() => handleFilterChange({ sort_by: option.value as FilterOptions['sort_by'] })}
                          className="text-purple-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Filtered Movies Grid */}
          {showFilters && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {filteredMovies.map((movie) => {
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
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Load More Movies
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