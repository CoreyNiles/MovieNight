import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Movie } from '../types';
import { justWatchAPI, JustWatchMovie } from '../services/justWatchAPI';

export const useMovieLibrary = (userId: string) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<JustWatchMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const libraryRef = collection(db, 'users', userId, 'library');
    const unsubscribe = onSnapshot(libraryRef, (snapshot) => {
      const movieList: Movie[] = [];
      snapshot.forEach((doc) => {
        movieList.push({
          id: doc.id,
          ...doc.data(),
          added_at: doc.data().added_at?.toDate() || new Date()
        } as Movie);
      });
      setMovies(movieList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const searchMoviesAPI = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      
      const response = await justWatchAPI.searchMovies(query, page);
      
      // Filter out movies without runtime (essential for scheduling)
      const validMovies = response.items.filter(movie => movie.runtime && movie.runtime > 0);
      
      setSearchResults(validMovies);
      
      if (validMovies.length === 0 && response.items.length > 0) {
        setSearchError('No movies found with valid runtime data. Try a different search.');
      }
    } catch (error: any) {
      console.error('Error searching movies:', error);
      setSearchError('Failed to search movies. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addMovieToLibrary = async (justWatchId: string) => {
    try {
      // Find the movie in search results first
      const movieFromSearch = searchResults.find(m => m.id.toString() === justWatchId);
      
      let movieData: JustWatchMovie | null = movieFromSearch || null;
      
      // If not in search results, try to get details from API
      if (!movieData) {
        movieData = await justWatchAPI.getMovieDetails(justWatchId);
      }
      
      if (!movieData) {
        throw new Error('Movie not found');
      }

      if (!movieData.runtime || movieData.runtime <= 0) {
        throw new Error('Movie runtime data is missing or invalid');
      }

      // Check if movie already exists in library
      const existingMovie = movies.find(m => m.justwatch_id === justWatchId);
      if (existingMovie) {
        throw new Error('Movie is already in your library');
      }

      const libraryRef = collection(db, 'users', userId, 'library');
      await addDoc(libraryRef, {
        title: movieData.title,
        justwatch_id: justWatchId,
        poster_url: movieData.poster || 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400',
        runtime: movieData.runtime,
        release_year: movieData.release_year || new Date().getFullYear(),
        genre_names: movieData.genre_names || [],
        short_description: movieData.short_description || '',
        nomination_streak: 0,
        added_at: new Date()
      });

      // Remove from search results after adding
      setSearchResults(prev => prev.filter(m => m.id.toString() !== justWatchId));
      
    } catch (error: any) {
      console.error('Error adding movie to library:', error);
      throw error;
    }
  };

  const removeMovieFromLibrary = async (movieId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'library', movieId));
    } catch (error) {
      console.error('Error removing movie from library:', error);
      throw error;
    }
  };

  const updateNominationStreak = async (movieId: string, streak: number) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'library', movieId), {
        nomination_streak: streak
      });
    } catch (error) {
      console.error('Error updating nomination streak:', error);
      throw error;
    }
  };

  const clearSearchResults = () => {
    setSearchResults([]);
    setSearchError(null);
  };

  return {
    movies,
    loading,
    searchResults,
    searching,
    searchError,
    searchMoviesAPI,
    addMovieToLibrary,
    removeMovieFromLibrary,
    updateNominationStreak,
    clearSearchResults
  };
};