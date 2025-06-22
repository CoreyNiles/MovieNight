import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Calendar, Star, Check, MapPin, Tv } from 'lucide-react';
import { TMDBMovie } from '../../services/tmdbAPI';
import { CONSTANTS } from '../../constants';

interface MovieCarouselProps {
  title: string;
  movies: TMDBMovie[];
  selectedMovies: string[];
  onMovieSelect: (movieId: string) => void;
  loading?: boolean;
}

export const MovieCarousel: React.FC<MovieCarouselProps> = ({
  title,
  movies,
  selectedMovies,
  onMovieSelect,
  loading = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Width of one movie card plus gap
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="flex space-x-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-96 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <p className="text-white/70">No movies available on major streaming services</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie) => {
          const movieId = movie.id.toString();
          const isSelected = selectedMovies.includes(movieId);
          
          return (
            <motion.div
              key={movie.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onMovieSelect(movieId)}
              className={`relative flex-shrink-0 w-72 bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
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
                    {movie.genre_names.slice(0, 2).map((genre) => (
                      <span key={genre} className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {movie.isStreamable && (
                  <div className="flex items-center space-x-1 text-green-400 text-xs mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>Available to stream</span>
                  </div>
                )}

                {movie.streaming_providers && movie.streaming_providers.length > 0 && (
                  <div className="flex items-center space-x-1 text-blue-400 text-xs">
                    <Tv className="h-3 w-3" />
                    <span>{movie.streaming_providers.slice(0, 2).join(', ')}</span>
                  </div>
                )}
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
    </div>
  );
};