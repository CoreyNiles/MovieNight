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
  isStreamable?: boolean;
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
  decade?: string;
  genres?: number[];
  min_rating?: number;
  sort_by?: 'popularity.desc' | 'release_date.desc' | 'vote_average.desc';
}

class TMDBAPI {
  // TASK 1: Fix case-insensitive search and simplify provider keywords
  private readonly majorStreamerKeywords = [
    'netflix', 
    'prime video', 
    'apple tv', 
    'disney', 
    'crave', 
    'mubi', 
    'tubi', 
    'paramount'
  ];

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
          response.results.map(async (movie: any) => {
            return await this.enrichMovieData(movie);
          })
        );

        // Filter for movies with streaming availability
        const validMovies = moviesWithDetails.filter(movie => movie?.isStreamable === true);

        // Sort by popularity
        const sortedMovies = validMovies.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

        return {
          items: sortedMovies.slice(0, CONSTANTS.TRENDING_MOVIES_LIMIT),
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

        // Filter for movies with streaming availability
        const validMovies = moviesWithDetails.filter(movie => movie?.isStreamable === true);

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
      if (filters.decade) {
        const startYear = parseInt(filters.decade);
        const endYear = startYear + 9;
        url += `&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31`;
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

        // Filter for movies with streaming availability
        const validMovies = moviesWithDetails.filter(movie => movie?.isStreamable === true);

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
      
      // TASK 1: Fix case-insensitive search - convert query to lowercase
      const lowerCaseQuery = query.toLowerCase();
      
      // Get search results from first few pages to ensure we find the right movie
      const maxPages = 3; // Reduced to avoid rate limiting but still comprehensive
      let allResults: any[] = [];

      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        try {
          const searchUrl = `${TMDB_API_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(lowerCaseQuery)}&page=${currentPage}&region=CA`;
          const response = await this.makeRequest(searchUrl);
          
          if (response.results && response.results.length > 0) {
            allResults = [...allResults, ...response.results];
          }
          
          // If we got fewer results than expected, we've reached the end
          if (!response.results || response.results.length < 20) {
            break;
          }
          
          // Small delay to avoid rate limiting
          if (currentPage < maxPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.warn(`Failed to fetch search page ${currentPage}:`, error);
          break;
        }
      }

      if (allResults.length === 0) {
        console.log('No results found for query:', query);
        return { items: [], total_pages: 1, page: 1 };
      }

      console.log(`Found ${allResults.length} total movies for "${query}"`);

      // TASK 2: Implement smart sorting for search relevance BEFORE enriching data
      const sortedResults = allResults.sort((a, b) => {
        const queryLower = lowerCaseQuery;
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        
        // Highest Priority: Exact match (case-insensitive)
        const exactMatchA = titleA === queryLower;
        const exactMatchB = titleB === queryLower;
        
        if (exactMatchA && !exactMatchB) return -1;
        if (!exactMatchA && exactMatchB) return 1;
        
        // Second Priority: Title contains the search query
        const containsA = titleA.includes(queryLower);
        const containsB = titleB.includes(queryLower);
        
        if (containsA && !containsB) return -1;
        if (!containsA && containsB) return 1;
        
        // Final Sorting: By vote average and popularity
        const scoreA = (a.vote_average || 0) * 10 + (a.release_year ? new Date(a.release_date).getFullYear() : 0) / 1000;
        const scoreB = (b.vote_average || 0) * 10 + (b.release_year ? new Date(b.release_date).getFullYear() : 0) / 1000;
        return scoreB - scoreA;
      });

      // Take top 50 most relevant results to enrich (this prevents rate limiting)
      const topResults = sortedResults.slice(0, 50);

      console.log(`Enriching top ${topResults.length} most relevant results...`);

      // Enrich the top results with streaming data
      const moviesWithDetails = await Promise.all(
        topResults.map(async (movie: any, index: number) => {
          // Add small delays between requests to avoid rate limiting
          if (index > 0 && index % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          return await this.enrichMovieData(movie);
        })
      );

      // Filter for movies with streaming availability
      const validMovies = moviesWithDetails.filter(movie => movie?.isStreamable === true);

      console.log(`Returning ${validMovies.length} streamable movies out of ${topResults.length} checked`);

      return {
        items: validMovies,
        total_pages: 1,
        page: 1
      };
    } catch (error) {
      console.error('TMDB search failed:', error);
    }

    return { items: [], total_pages: 1, page: 1 };
  }

  // Lazy loading function for individual movie details
  async getMovieStreamingDetails(movieId: string): Promise<{ isStreamable: boolean; streaming_providers: string[]; runtime?: number; genre_names?: string[] } | null> {
    try {
      console.log(`Loading streaming details for movie ${movieId}...`);
      
      // Get detailed movie info
      const detailUrl = `${TMDB_API_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
      const details = await this.makeRequest(detailUrl);
      
      // Get Canadian watch providers
      const providersUrl = `${TMDB_API_BASE}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
      const providers = await this.makeRequest(providersUrl);
      
      const canadianProviders = providers.results?.CA;
      let streamingProviders: string[] = [];
      let isStreamable = false;
      
      if (canadianProviders) {
        // ONLY get subscription (flatrate) providers - no rentals or purchases
        const flatrateProviders = canadianProviders.flatrate || [];
        
        // TASK 1: Fix the provider check - simplified filter logic
        const majorProviders = flatrateProviders.filter((provider: any) =>
          this.majorStreamerKeywords.some(keyword =>
            provider.provider_name.toLowerCase().includes(keyword)
          )
        );
        
        streamingProviders = [...new Set(majorProviders.map((provider: any) => provider.provider_name))];
        isStreamable = streamingProviders.length > 0;
        
        console.log(`Movie ${movieId} streaming details:`, {
          flatrateProviders: flatrateProviders.map((p: any) => p.provider_name),
          majorProviders: majorProviders.map((p: any) => p.provider_name),
          isStreamable,
          streamingProviders,
          runtime: details.runtime
        });
      }

      return {
        isStreamable,
        streaming_providers: streamingProviders,
        runtime: details.runtime,
        genre_names: details.genres?.map((g: any) => g.name) || []
      };
    } catch (error) {
      console.error(`Failed to get streaming details for movie ${movieId}:`, error);
      return null;
    }
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

  getAvailableDecades(): string[] {
    const currentYear = new Date().getFullYear();
    const currentDecade = Math.floor(currentYear / 10) * 10;
    const decades = [];
    
    for (let decade = currentDecade; decade >= 1950; decade -= 10) {
      decades.push(`${decade}s`);
    }
    
    return decades;
  }

  private async enrichMovieData(movie: any): Promise<TMDBMovie> {
    try {
      // Get detailed info if we only have basic data
      let details = movie;
      if (!movie.runtime && movie.id) {
        try {
          const detailUrl = `${TMDB_API_BASE}/movie/${movie.id}?api_key=${TMDB_API_KEY}`;
          details = await this.makeRequest(detailUrl);
        } catch (error) {
          console.warn(`Failed to get details for movie ${movie.id}:`, error);
          // Continue with basic data
        }
      }
      
      // Get Canadian watch providers
      let canadianProviders = null;
      let streamingProviders: string[] = [];
      let isStreamable = false; // Default to false - must prove availability
      
      try {
        const providersUrl = `${TMDB_API_BASE}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`;
        const providers = await this.makeRequest(providersUrl);
        canadianProviders = providers.results?.CA;
        
        if (canadianProviders) {
          // ONLY get subscription (flatrate) providers - no rentals or purchases
          const flatrateProviders = canadianProviders.flatrate || [];
          
          // TASK 1: Fix the provider check - simplified filter logic
          const majorProviders = flatrateProviders.filter((provider: any) =>
            this.majorStreamerKeywords.some(keyword =>
              provider.provider_name.toLowerCase().includes(keyword)
            )
          );
          
          streamingProviders = [...new Set(majorProviders.map((provider: any) => provider.provider_name))];
          isStreamable = streamingProviders.length > 0;
          
          console.log(`Movie: ${movie.title}`, {
            flatrateProviders: flatrateProviders.map((p: any) => p.provider_name),
            majorProviders: majorProviders.map((p: any) => p.provider_name),
            finalStreamingProviders: streamingProviders,
            isStreamable
          });
        }
      } catch (error) {
        console.warn(`Failed to get providers for movie ${movie.id}:`, error);
        // Continue without provider info
      }

      return {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${CONSTANTS.TMDB_IMAGE_BASE_URL}${movie.poster_path}` : undefined,
        runtime: details.runtime || undefined,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        genre_names: details.genres?.map((g: any) => g.name) || [],
        short_description: movie.overview || undefined,
        isStreamable: isStreamable,
        streaming_providers: streamingProviders,
        vote_average: movie.vote_average,
        release_date: movie.release_date
      };
    } catch (error) {
      console.error('Error enriching movie data:', error);
      // Return basic data but mark as not streamable if enrichment fails
      return {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${CONSTANTS.TMDB_IMAGE_BASE_URL}${movie.poster_path}` : undefined,
        runtime: undefined,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        genre_names: [],
        short_description: movie.overview || undefined,
        isStreamable: false, // Default to false if we can't verify
        streaming_providers: [],
        vote_average: movie.vote_average,
        release_date: movie.release_date
      };
    }
  }
}

export const tmdbAPI = new TMDBAPI();
export type { TMDBMovie, TMDBSearchResponse, FilterOptions };