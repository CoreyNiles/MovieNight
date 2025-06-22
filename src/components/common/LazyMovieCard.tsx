import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Calendar, Star, MapPin, Tv, Loader2 } from 'lucide-react';
import { tmdbAPI, TMDBMovie } from '../../services/tmdbAPI';
import { CONSTANTS } from '../../constants';

interface LazyMovieCardProps {
  movie: TMDBMovie;
  isSelected: boolean;
  onSelect: (movieId: string) => void;
  className?: string;
}

export const LazyMovieCard: React.FC<LazyMovieCardProps> = ({
  movie,
  isSelected,
  onSelect,
  className = ''
}) => {
  const [streamingDetails, setStreamingDetails] = useState<{
    isStreamable: boolean;
    streaming_providers: string[];
    runtime?: number;
    genre_names?: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load streaming details when user hovers or clicks
  const loadStreamingDetails = async () => {
    if (hasLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      const details = await tmdbAPI.getMovieStreamingDetails(movie.id.toString());
      setStreamingDetails(details);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load streaming details:', error);
      setStreamingDetails({
        isStreamable: false,
        streaming_providers: []
      });
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInteraction = () => {
    loadStreamingDetails();
  };

  const handleSelect = () => {
    // Only allow selection if we know it's streamable
    if (streamingDetails?.isStreamable) {
      onSelect(movie.id.toString());
    } else if (!hasLoaded) {
      // If not loaded yet, load details first
      loadStreamingDetails();
    }
  };

  // Show loading state while checking streaming availability
  const showLoadingState = isLoading && !hasLoaded;
  
  // Show as disabled if we've checked and it's not streamable
  const isDisabled = hasLoaded && !streamingDetails?.isStreamable;
  
  // Show as available if we've confirmed it's streamable
  const isAvailable = hasLoaded && streamingDetails?.isStreamable;

  return (
    <motion.div
      whileHover={{ scale: isDisabled ? 1 : 1.05 }}
      whileTap={{ scale: isDisabled ? 1 : 0.95 }}
      onHoverStart={handleInteraction}
      onClick={handleSelect}
      className={`relative bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'ring-4 ring-purple-500 shadow-lg shadow-purple-500/25'
          : isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : isAvailable
          ? 'hover:bg-white/20 cursor-pointer'
          : 'hover:bg-white/15 cursor-pointer'
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
          {(streamingDetails?.runtime || movie.runtime) && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{streamingDetails?.runtime || movie.runtime}m</span>
            </div>
          )}
        </div>
        
        {movie.vote_average && (
          <div className="flex items-center space-x-1 text-yellow-400 text-sm mb-2">
            <Star className="h-4 w-4 fill-current" />
            <span>{movie.vote_average.toFixed(1)}</span>
          </div>
        )}

        {/* Streaming Status */}
        <div className="min-h-[20px] flex items-center">
          {showLoadingState && (
            <div className="flex items-center space-x-2 text-blue-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking availability...</span>
            </div>
          )}
          
          {isAvailable && streamingDetails && (
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-green-400 text-xs">
                <MapPin className="h-3 w-3" />
                <span>Available to stream</span>
              </div>
              {streamingDetails.streaming_providers.length > 0 && (
                <div className="flex items-center space-x-1 text-blue-400 text-xs">
                  <Tv className="h-3 w-3" />
                  <span>{streamingDetails.streaming_providers.slice(0, 2).join(', ')}</span>
                </div>
              )}
            </div>
          )}
          
          {isDisabled && (
            <div className="text-red-400 text-xs">
              Not available on major streaming services
            </div>
          )}
          
          {!hasLoaded && !isLoading && (
            <div className="text-white/50 text-xs">
              Hover to check availability
            </div>
          )}
        </div>

        {/* Genre tags */}
        {streamingDetails?.genre_names && streamingDetails.genre_names.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {streamingDetails.genre_names.slice(0, 2).map((genre) => (
              <span key={genre} className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {isSelected && (
        <div className="absolute top-2 right-2 bg-purple-500 text-white p-2 rounded-full">
          <Check className="h-4 w-4" />
        </div>
      )}
      
      {showLoadingState && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}
    </motion.div>
  );
};