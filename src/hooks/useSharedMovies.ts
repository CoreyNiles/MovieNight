import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Movie } from '../types';

interface SharedMovie extends Omit<Movie, 'id'> {
  id: string;
  original_owner: string;
  shared_at: Date;
}

export const useSharedMovies = () => {
  const [sharedMovies, setSharedMovies] = useState<SharedMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sharedMoviesRef = collection(db, 'sharedMovies');
    const unsubscribe = onSnapshot(sharedMoviesRef, (snapshot) => {
      const movies: SharedMovie[] = [];
      snapshot.forEach((doc) => {
        movies.push({
          id: doc.id,
          ...doc.data(),
          shared_at: doc.data().shared_at?.toDate() || new Date()
        } as SharedMovie);
      });
      setSharedMovies(movies);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const shareMovie = async (movie: Movie, userId: string) => {
    try {
      const sharedMovieRef = doc(db, 'sharedMovies', movie.id);
      
      // Use a transaction to ensure atomic check-and-set
      await runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(sharedMovieRef);
        
        if (!existingDoc.exists()) {
          transaction.set(sharedMovieRef, {
            title: movie.title,
            justwatch_id: movie.justwatch_id,
            poster_url: movie.poster_url,
            runtime: movie.runtime,
            release_year: movie.release_year,
            genre_names: movie.genre_names || [],
            short_description: movie.short_description || '',
            nomination_streak: movie.nomination_streak,
            added_at: movie.added_at,
            original_owner: userId,
            shared_at: new Date()
          });
        }
      });
    } catch (error) {
      console.error('Error sharing movie:', error);
      throw error;
    }
  };

  return {
    sharedMovies,
    loading,
    shareMovie
  };
};