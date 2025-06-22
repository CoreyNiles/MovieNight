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
  // Define major streaming services we want to prioritize
  private readonly majorStreamingServices = [
    'Netflix',
    'Amazon Prime Video', 
    'Apple TV Plus',
    'Apple TV',
    'Disney Plus',
    'Disney+',
    'HBO Max',
    'Crave',
    'Paramount Plus',
    'Paramount+',
    'Hulu'
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
        const validMovies = moviesWithDetails.filter(movie => 
          movie.title && 
          movie.title.trim().length > 0 &&
          movie.isStreamable === true &&
          movie.streaming_providers && 
          movie.streaming_providers.length > 0
        );

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
        const validMovies = moviesWithDetails.filter(movie => 
          movie.title && 
          movie.title.trim().length > 0 &&
          movie.isStreamable === true &&
          movie.streaming_providers && 
          movie.streaming_providers.length > 0
        );

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
        const validMovies = moviesWithDetails.filter(movie => 
          movie.title && 
          movie.title.trim().length > 0 &&
          movie.isStreamable === true &&
          movie.streaming_providers && 
          movie.streaming_providers.length > 0
        );

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
      
      // First, get the initial page to determine total pages
      const initialUrl = `${TMDB_API_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1&region=CA`;
      const initialResponse = await this.makeRequest(initialUrl);
      
      if (!initialResponse.results || initialResponse.results.length === 0) {
        console.log('No results found for query:', query);
        return { items: [], total_pages: 1, page: 1 };
      }

      const totalPages = Math.min(initialResponse.total_pages || 1, 20); // Increased to 20 pages for comprehensive search
      let allResults = [...initialResponse.results];

      console.log(`Found ${initialResponse.total_results} total results across ${totalPages} pages for "${query}"`);

      // Fetch additional pages if available
      if (totalPages > 1) {
        console.log(`Fetching ${totalPages} pages of search results...`);
        
        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          // Add delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
          
          try {
            const pageUrl = `${TMDB_API_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${currentPage}&region=CA`;
            const pageResponse = await this.makeRequest(pageUrl);
            
            if (pageResponse.results && pageResponse.results.length > 0) {
              allResults = [...allResults, ...pageResponse.results];
            }
          } catch (error) {
            console.warn(`Failed to fetch page ${currentPage}:`, error);
            // Continue with other pages even if one fails
          }
        }
      }

      console.log(`Found ${allResults.length} total movies across ${totalPages} pages`);

      if (allResults.length > 0) {
        // Process all movies - but do it more efficiently
        const moviesWithDetails = [];
        
        // Process in smaller batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < allResults.length; i += batchSize) {
          const batch = allResults.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(async (movie: any) => {
              try {
                return await this.enrichMovieData(movie);
              } catch (error) {
                console.warn(`Failed to enrich movie ${movie.title}:`, error);
                // Return basic movie data even if enrichment fails
                return {
                  id: movie.id,
                  title: movie.title,
                  poster: movie.poster_path ? `${CONSTANTS.TMDB_IMAGE_BASE_URL}${movie.poster_path}` : undefined,
                  runtime: undefined,
                  release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                  genre_names: [],
                  short_description: movie.overview || undefined,
                  isStreamable: true, // Default to true for search results
                  streaming_providers: [],
                  vote_average: movie.vote_average,
                  release_date: movie.release_date
                };
              }
            })
          );
          
          moviesWithDetails.push(...batchResults.filter(movie => movie !== null));
          
          // Add delay between batches
          if (i + batchSize < allResults.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        console.log(`Successfully processed ${moviesWithDetails.length} movies`);

        // CRITICAL: Filter to only show movies available on major streaming services
        const validMovies = moviesWithDetails.filter(movie => 
          movie && 
          movie.title && 
          movie.title.trim().length > 0 &&
          movie.isStreamable === true &&
          movie.streaming_providers && 
          movie.streaming_providers.length > 0 &&
          // Additional filter: must have runtime (filters out weird entries)
          movie.runtime && 
          movie.runtime > 60 && // At least 60 minutes
          movie.release_year && 
          movie.release_year > 1950 // Reasonable release year
        );

        // Sort by relevance (vote average and popularity)
        const sortedMovies = validMovies.sort((a, b) => {
          // Prioritize movies with higher ratings
          const scoreA = (a.vote_average || 0) * 10 + (a.release_year || 0) / 1000;
          const scoreB = (b.vote_average || 0) * 10 + (b.release_year || 0) / 1000;
          return scoreB - scoreA;
        });

        console.log(`Returning ${sortedMovies.length} valid movies`);

        return {
          items: sortedMovies,
          total_pages: totalPages,
          page: 1
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
          const subscriptionProviders = canadianProviders.flatrate || [];
          
          // Filter to only major streaming services
          const majorProviders = subscriptionProviders.filter((provider: any) =>
            this.majorStreamingServices.some(majorService =>
              provider.provider_name.toLowerCase().includes(majorService.toLowerCase()) ||
              majorService.toLowerCase().includes(provider.provider_name.toLowerCase())
            )
          );
          
          streamingProviders = [...new Set(majorProviders.map((provider: any) => provider.provider_name))];
          isStreamable = streamingProviders.length > 0;
          
          console.log(`Movie: ${movie.title}`, {
            allSubscriptionProviders: subscriptionProviders.map((p: any) => p.provider_name),
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