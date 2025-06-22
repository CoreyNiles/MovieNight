import { CONSTANTS } from '../constants';

// TMDB API service for movie search and details with Canadian availability
const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

interface TMDBMovie {
  id: number;
  title: string;
  poster?: string;
  runtime?: number;
  release_year?: number;
  genre_names?: string[];
  short_description?: string;
  imdb_id?: string;
  available_in_canada?: boolean;
  streaming_providers?: string[];
  vote_average?: number;
  release_date?: string;
}

interface TMDBSearchResponse {
  items: TMDBMovie[];
  total_pages: number;
  page: number;
}

interface FilterOptions {
  year_range?: { min: number; max: number };
  genres?: number[];
  min_rating?: number;
  sort_by?: 'popularity.desc' | 'release_date.desc' | 'vote_average.desc';
}

class TMDBAPI {
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getTrendingMovies(): Promise<TMDBSearchResponse> {
    try {
      console.log('Fetching trending movies...');
      
      const trendingUrl = `${TMDB_API_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}&region=CA`;
      const response = await this.makeRequest(trendingUrl);
      
      if (response.results && response.results.length > 0) {
        const moviesWithDetails = await Promise.all(
          response.results.slice(0, CONSTANTS.TRENDING_MOVIES_LIMIT).map(async (movie: any) => {
            return await this.enrichMovieData(movie);
          })
        );

        const validMovies = moviesWithDetails.filter(movie => movie.runtime && movie.runtime > 0);

        return {
          items: validMovies,
          total_pages: 1,
          page: 1
        };
      }
    } catch (error) {
      console.error('Failed to fetch trending movies:', error);
    }

    return { items: [], total_pages: 1, page: 1 };
  }

  async getMoviesByGenre(genreId: number, page: number = 1): Promise<TMDBSearchResponse> {
    try {
      console.log(`Fetching movies for genre ${genreId}...`);
      
      const genreUrl = `${TMDB_API_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&region=CA&page=${page}&sort_by=popularity.desc`;
      const response = await this.makeRequest(genreUrl);
      
      if (response.results && response.results.length > 0) {
        const moviesWithDetails = await Promise.all(
          response.results.map(async (movie: any) => {
            return await this.enrichMovieData(movie);
          })
        );

        const validMovies = moviesWithDetails.filter(movie => movie.runtime && movie.runtime > 0);

        return {
          items: validMovies,
          total_pages: response.total_pages || 1,
          page: response.page || 1
        };
      }
    } catch (error) {
      console.error(`Failed to fetch movies for genre ${genreId}:`, error);
    }

    return { items: [], total_pages: 1, page: 1 };
  }

  async getMoviesByProvider(providerId: number, filters: FilterOptions = {}, page: number = 1): Promise<TMDBSearchResponse> {
    try {
      console.log(`Fetching movies for provider ${providerId}...`);
      
      let url = `${TMDB_API_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=CA&page=${page}`;
      
      // Apply filters
      if (filters.year_range) {
        url += `&primary_release_date.gte=${filters.year_range.min}-01-01&primary_release_date.lte=${filters.year_range.max}-12-31`;
      }
      
      if (filters.genres && filters.genres.length > 0) {
        url += `&with_genres=${filters.genres.join(',')}`;
      }
      
      if (filters.min_rating) {
        url += `&vote_average.gte=${filters.min_rating}`;
      }
      
      if (filters.sort_by) {
        url += `&sort_by=${filters.sort_by}`;
      } else {
        url += '&sort_by=popularity.desc';
      }
      
      const response = await this.makeRequest(url);
      
      if (response.results && response.results.length > 0) {
        const moviesWithDetails = await Promise.all(
          response.results.map(async (movie: any) => {
            return await this.enrichMovieData(movie);
          })
        );

        const validMovies = moviesWithDetails.filter(movie => movie.runtime && movie.runtime > 0);

        return {
          items: validMovies,
          total_pages: response.total_pages || 1,
          page: response.page || 1
        };
      }
    } catch (error) {
      console.error(`Failed to fetch movies for provider ${providerId}:`, error);
    }

    return { items: [], total_pages: 1, page: 1 };
  }

  async searchMovies(query: string, page: number = 1): Promise<TMDBSearchResponse> {
    try {
      console.log('Searching for movies:', query);
      
      const tmdbUrl = `${TMDB_API_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&region=CA`;
      const tmdbResponse = await this.makeRequest(tmdbUrl);
      
      if (tmdbResponse.results && tmdbResponse.results.length > 0) {
        const moviesWithDetails = await Promise.all(
          tmdbResponse.results.slice(0, CONSTANTS.SEARCH_RESULTS_LIMIT).map(async (movie: any) => {
            return await this.enrichMovieData(movie);
          })
        );

        const validMovies = moviesWithDetails.filter(movie => movie.runtime && movie.runtime > 0);

        return {
          items: validMovies,
          total_pages: tmdbResponse.total_pages || 1,
          page: tmdbResponse.page || 1
        };
      }
    } catch (error) {
      console.error('TMDB search failed:', error);
    }

    return { items: [], total_pages: 1, page: 1 };
  }

  async getMovieDetails(movieId: string): Promise<TMDBMovie | null> {
    try {
      const detailUrl = `${TMDB_API_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
      const details = await this.makeRequest(detailUrl);
      
      return await this.enrichMovieData(details);
    } catch (error) {
      console.error('Failed to get movie details from TMDB:', error);
      return null;
    }
  }

  private async enrichMovieData(movie: any): Promise<TMDBMovie> {
    try {
      // Get detailed info if we only have basic data
      let details = movie;
      if (!movie.runtime) {
        const detailUrl = `${TMDB_API_BASE}/movie/${movie.id}?api_key=${TMDB_API_KEY}`;
        details = await this.makeRequest(detailUrl);
      }
      
      // Get Canadian watch providers
      const providersUrl = `${TMDB_API_BASE}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`;
      const providers = await this.makeRequest(providersUrl);
      
      const canadianProviders = providers.results?.CA;
      const availableInCanada = !!(canadianProviders?.flatrate || canadianProviders?.rent || canadianProviders?.buy);
      
      const streamingProviders = [];
      if (canadianProviders?.flatrate) {
        streamingProviders.push(...canadianProviders.flatrate.map((p: any) => p.provider_name));
      }
      if (canadianProviders?.rent) {
        streamingProviders.push(...canadianProviders.rent.map((p: any) => p.provider_name));
      }
      if (canadianProviders?.buy) {
        streamingProviders.push(...canadianProviders.buy.map((p: any) => p.provider_name));
      }

      return {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${CONSTANTS.TMDB_IMAGE_BASE_URL}${movie.poster_path}` : undefined,
        runtime: details.runtime || undefined,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        genre_names: details.genres?.map((g: any) => g.name) || [],
        short_description: movie.overview || undefined,
        available_in_canada: availableInCanada,
        streaming_providers: [...new Set(streamingProviders)],
        vote_average: movie.vote_average,
        release_date: movie.release_date
      };
    } catch (error) {
      console.error('Error enriching movie data:', error);
      return {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${CONSTANTS.TMDB_IMAGE_BASE_URL}${movie.poster_path}` : undefined,
        runtime: undefined,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        genre_names: [],
        short_description: movie.overview || undefined,
        available_in_canada: false,
        streaming_providers: [],
        vote_average: movie.vote_average,
        release_date: movie.release_date
      };
    }
  }
}

export const tmdbAPI = new TMDBAPI();
export type { TMDBMovie, TMDBSearchResponse, FilterOptions };