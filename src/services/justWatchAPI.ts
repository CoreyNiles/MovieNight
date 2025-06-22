// JustWatch API service for movie search and details with Canadian availability
const JUSTWATCH_API_BASE = 'https://apis.justwatch.com/content';
const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'a07e22bc18f5cb106bfe4cc1f83ad8ed'; // Public TMDB API key

interface JustWatchMovie {
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
}

interface JustWatchSearchResponse {
  items: JustWatchMovie[];
  total_pages: number;
  page: number;
}

class JustWatchAPI {
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

  async searchMovies(query: string, page: number = 1): Promise<JustWatchSearchResponse> {
    try {
      console.log('Searching for movies:', query);
      
      // Use TMDB API for movie search (more reliable and has CORS support)
      const tmdbUrl = `${TMDB_API_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&region=CA`;
      
      const tmdbResponse = await this.makeRequest(tmdbUrl);
      
      if (tmdbResponse.results && tmdbResponse.results.length > 0) {
        // Get detailed info for each movie including runtime
        const moviesWithDetails = await Promise.all(
          tmdbResponse.results.slice(0, 10).map(async (movie: any) => {
            try {
              // Get movie details including runtime
              const detailUrl = `${TMDB_API_BASE}/movie/${movie.id}?api_key=${TMDB_API_KEY}`;
              const details = await this.makeRequest(detailUrl);
              
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
                poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
                runtime: details.runtime || undefined,
                release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                genre_names: details.genres?.map((g: any) => g.name) || [],
                short_description: movie.overview || undefined,
                available_in_canada: availableInCanada,
                streaming_providers: [...new Set(streamingProviders)]
              };
            } catch (error) {
              console.error('Error getting movie details:', error);
              // Return basic info if detailed fetch fails
              return {
                id: movie.id,
                title: movie.title,
                poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
                runtime: undefined,
                release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                genre_names: [],
                short_description: movie.overview || undefined,
                available_in_canada: false,
                streaming_providers: []
              };
            }
          })
        );

        // Filter out movies without runtime (essential for scheduling)
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

    // Fallback to curated movies if API fails
    console.log('Falling back to curated movies');
    return this.getCuratedMovies(query);
  }

  async getMovieDetails(movieId: string): Promise<JustWatchMovie | null> {
    try {
      // Try to get from TMDB first
      const detailUrl = `${TMDB_API_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
      const details = await this.makeRequest(detailUrl);
      
      // Get Canadian watch providers
      const providersUrl = `${TMDB_API_BASE}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
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
        id: details.id,
        title: details.title,
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
        runtime: details.runtime,
        release_year: details.release_date ? new Date(details.release_date).getFullYear() : undefined,
        genre_names: details.genres?.map((g: any) => g.name) || [],
        short_description: details.overview,
        available_in_canada: availableInCanada,
        streaming_providers: [...new Set(streamingProviders)]
      };
    } catch (error) {
      console.error('Failed to get movie details from TMDB:', error);
      
      // Fallback to curated movies
      const curatedMovies = this.getAllCuratedMovies();
      const movie = curatedMovies.find(m => m.id.toString() === movieId);
      return movie || null;
    }
  }

  // Enhanced curated movie list with Canadian availability info
  private getCuratedMovies(query: string): JustWatchSearchResponse {
    const allMovies = this.getAllCuratedMovies();
    
    const filteredMovies = query 
      ? allMovies.filter(movie => 
          movie.title.toLowerCase().includes(query.toLowerCase()) ||
          movie.genre_names?.some(genre => genre.toLowerCase().includes(query.toLowerCase())) ||
          movie.short_description?.toLowerCase().includes(query.toLowerCase())
        )
      : allMovies;

    return {
      items: filteredMovies,
      total_pages: 1,
      page: 1
    };
  }

  private getAllCuratedMovies(): JustWatchMovie[] {
    return [
      {
        id: 111161,
        title: 'The Shawshank Redemption',
        poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        runtime: 142,
        release_year: 1994,
        genre_names: ['Drama'],
        short_description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 68646,
        title: 'The Godfather',
        poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        runtime: 175,
        release_year: 1972,
        genre_names: ['Crime', 'Drama'],
        short_description: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        available_in_canada: true,
        streaming_providers: ['Paramount+', 'Amazon Prime Video']
      },
      {
        id: 468569,
        title: 'The Dark Knight',
        poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        runtime: 152,
        release_year: 2008,
        genre_names: ['Action', 'Crime', 'Drama'],
        short_description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
        available_in_canada: true,
        streaming_providers: ['HBO Max', 'Crave']
      },
      {
        id: 108052,
        title: 'Schindler\'s List',
        poster: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
        runtime: 195,
        release_year: 1993,
        genre_names: ['Biography', 'Drama', 'History'],
        short_description: 'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 167260,
        title: 'The Lord of the Rings: The Return of the King',
        poster: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
        runtime: 201,
        release_year: 2003,
        genre_names: ['Action', 'Adventure', 'Drama'],
        short_description: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam as they approach Mount Doom.',
        available_in_canada: true,
        streaming_providers: ['HBO Max', 'Crave']
      },
      {
        id: 110912,
        title: 'Pulp Fiction',
        poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        runtime: 154,
        release_year: 1994,
        genre_names: ['Crime', 'Drama'],
        short_description: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 137523,
        title: 'Fight Club',
        poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        runtime: 139,
        release_year: 1999,
        genre_names: ['Drama'],
        short_description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
        available_in_canada: true,
        streaming_providers: ['Amazon Prime Video', 'Apple TV']
      },
      {
        id: 1375666,
        title: 'Inception',
        poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        runtime: 148,
        release_year: 2010,
        genre_names: ['Action', 'Sci-Fi', 'Thriller'],
        short_description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'HBO Max', 'Crave']
      },
      {
        id: 133093,
        title: 'The Matrix',
        poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        runtime: 136,
        release_year: 1999,
        genre_names: ['Action', 'Sci-Fi'],
        short_description: 'A computer programmer is led to fight an underground war against powerful computers who have constructed his entire reality.',
        available_in_canada: true,
        streaming_providers: ['HBO Max', 'Crave']
      },
      {
        id: 99685,
        title: 'Goodfellas',
        poster: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
        runtime: 146,
        release_year: 1990,
        genre_names: ['Biography', 'Crime', 'Drama'],
        short_description: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 816692,
        title: 'Interstellar',
        poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        runtime: 169,
        release_year: 2014,
        genre_names: ['Adventure', 'Drama', 'Sci-Fi'],
        short_description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        available_in_canada: true,
        streaming_providers: ['Amazon Prime Video', 'Apple TV']
      },
      {
        id: 120815,
        title: 'Saving Private Ryan',
        poster: 'https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg',
        runtime: 169,
        release_year: 1998,
        genre_names: ['Drama', 'War'],
        short_description: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 13,
        title: 'Forrest Gump',
        poster: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
        runtime: 142,
        release_year: 1994,
        genre_names: ['Drama', 'Romance'],
        short_description: 'The presidencies of Kennedy and Johnson, the events of Vietnam, Watergate and other historical events unfold from the perspective of an Alabama man.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 155,
        title: 'The Dark Knight',
        poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        runtime: 152,
        release_year: 2008,
        genre_names: ['Action', 'Crime', 'Drama'],
        short_description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
        available_in_canada: true,
        streaming_providers: ['HBO Max', 'Crave']
      },
      {
        id: 497,
        title: 'The Green Mile',
        poster: 'https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
        runtime: 189,
        release_year: 1999,
        genre_names: ['Crime', 'Drama', 'Fantasy'],
        short_description: 'The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 680,
        title: 'Pulp Fiction',
        poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        runtime: 154,
        release_year: 1994,
        genre_names: ['Crime', 'Drama'],
        short_description: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 122,
        title: 'The Lord of the Rings: The Return of the King',
        poster: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
        runtime: 201,
        release_year: 2003,
        genre_names: ['Action', 'Adventure', 'Drama'],
        short_description: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam as they approach Mount Doom.',
        available_in_canada: true,
        streaming_providers: ['HBO Max', 'Crave']
      },
      {
        id: 424,
        title: 'Schindler\'s List',
        poster: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
        runtime: 195,
        release_year: 1993,
        genre_names: ['Biography', 'Drama', 'History'],
        short_description: 'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 12,
        title: 'Finding Nemo',
        poster: 'https://image.tmdb.org/t/p/w500/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg',
        runtime: 100,
        release_year: 2003,
        genre_names: ['Animation', 'Adventure', 'Comedy'],
        short_description: 'After his son is captured in the Great Barrier Reef and taken to Sydney, a timid clownfish sets out on a journey to bring him home.',
        available_in_canada: true,
        streaming_providers: ['Disney+']
      },
      {
        id: 238,
        title: 'The Godfather',
        poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        runtime: 175,
        release_year: 1972,
        genre_names: ['Crime', 'Drama'],
        short_description: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        available_in_canada: true,
        streaming_providers: ['Paramount+', 'Amazon Prime Video']
      },
      {
        id: 278,
        title: 'The Shawshank Redemption',
        poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        runtime: 142,
        release_year: 1994,
        genre_names: ['Drama'],
        short_description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 27205,
        title: 'Inception',
        poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        runtime: 148,
        release_year: 2010,
        genre_names: ['Action', 'Sci-Fi', 'Thriller'],
        short_description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'HBO Max', 'Crave']
      },
      {
        id: 603,
        title: 'The Matrix',
        poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        runtime: 136,
        release_year: 1999,
        genre_names: ['Action', 'Sci-Fi'],
        short_description: 'A computer programmer is led to fight an underground war against powerful computers who have constructed his entire reality.',
        available_in_canada: true,
        streaming_providers: ['HBO Max', 'Crave']
      },
      {
        id: 769,
        title: 'GoodFellas',
        poster: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
        runtime: 146,
        release_year: 1990,
        genre_names: ['Biography', 'Crime', 'Drama'],
        short_description: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 157336,
        title: 'Interstellar',
        poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        runtime: 169,
        release_year: 2014,
        genre_names: ['Adventure', 'Drama', 'Sci-Fi'],
        short_description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        available_in_canada: true,
        streaming_providers: ['Amazon Prime Video', 'Apple TV']
      },
      {
        id: 539,
        title: 'Saving Private Ryan',
        poster: 'https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg',
        runtime: 169,
        release_year: 1998,
        genre_names: ['Drama', 'War'],
        short_description: 'Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper.',
        available_in_canada: true,
        streaming_providers: ['Netflix', 'Amazon Prime Video']
      },
      {
        id: 299534,
        title: 'Avengers: Endgame',
        poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
        runtime: 181,
        release_year: 2019,
        genre_names: ['Action', 'Adventure', 'Drama'],
        short_description: 'After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos\' actions and restore balance to the universe.',
        available_in_canada: true,
        streaming_providers: ['Disney+']
      },
      {
        id: 299536,
        title: 'Avengers: Infinity War',
        poster: 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
        runtime: 149,
        release_year: 2018,
        genre_names: ['Action', 'Adventure', 'Sci-Fi'],
        short_description: 'The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos before his blitz of devastation.',
        available_in_canada: true,
        streaming_providers: ['Disney+']
      },
      {
        id: 1726,
        title: 'Iron Man',
        poster: 'https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
        runtime: 126,
        release_year: 2008,
        genre_names: ['Action', 'Adventure', 'Sci-Fi'],
        short_description: 'After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil.',
        available_in_canada: true,
        streaming_providers: ['Disney+']
      },
      {
        id: 862,
        title: 'Toy Story',
        poster: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
        runtime: 81,
        release_year: 1995,
        genre_names: ['Animation', 'Adventure', 'Comedy'],
        short_description: 'A cowboy doll is profoundly threatened and jealous when a new spaceman figure supplants him as top toy in a boy\'s room.',
        available_in_canada: true,
        streaming_providers: ['Disney+']
      },
      {
        id: 10681,
        title: 'WALL-E',
        poster: 'https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
        runtime: 98,
        release_year: 2008,
        genre_names: ['Animation', 'Adventure', 'Family'],
        short_description: 'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will ultimately decide the fate of mankind.',
        available_in_canada: true,
        streaming_providers: ['Disney+']
      }
    ];
  }
}

export const justWatchAPI = new JustWatchAPI();
export type { JustWatchMovie, JustWatchSearchResponse };