import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Calendar, Star, MapPin, Tv } from 'lucide-react';
import { TMDBMovie } from '../../services/tmdbAPI';
import { CONSTANTS } from '../../constants';

interface MovieCardProps {
  movie: TMDBMovie;
  isSelected: boolean;
  onSelect: (movieId: string) => void;
  className?: string;
}

// Renamed to MovieCard since we are removing the lazy loading
export const LazyMovieCard: React.FC<MovieCardProps> = ({
  movie,
  isSelected,
  onSelect,
  className = ''
}) => {
  // --- All the complex state and fetching logic has been removed ---

  // Use the data directly from the 'movie' prop
  const isAvailable = movie.isStreamable;
  const isDisabled = !movie.isStreamable;

  const handleSelect = () => {
    if (isAvailable) {
      onSelect(movie.id.toString());
    }
  };

  return (
    <motion.div
      whileHover={{ scale: isDisabled ? 1 : 1.05 }}
      whileTap={{ scale: isDisabled ? 1 : 0.95 }}
      // The onHoverStart handler has been removed
      onClick={handleSelect}
      className={`relative bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/25'
          : isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-white/20 cursor-pointer'
      } ${className}`}
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

        {/* --- This Streaming Status block now directly uses the 'movie' prop --- */}
        <div className="min-h-[40px] flex flex-col justify-center">
          {isAvailable ? (
            <>
              <div className="flex items-center space-x-1 text-green-400 text-xs mb-1">
                <MapPin className="h-3 w-3" />
                <span>Available to stream</span>
              </div>
              {movie.streaming_providers && movie.streaming_providers.length > 0 && (
                <div className="flex items-center space-x-1 text-blue-400 text-xs">
                  <Tv className="h-3 w-3" />
                  <span className="line-clamp-1">{movie.streaming_providers.join(', ')}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-red-400 text-xs">
              Not on major streaming services
            </div>
          )}
        </div>
      </div>
      
      {isSelected && (
        <div className="absolute top-2 right-2 bg-purple-500 text-white p-2 rounded-full">
          <Check className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
};