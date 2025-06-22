// Application Constants
export const CONSTANTS = {
  // Image URLs
  FALLBACK_POSTER_URL: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400',
  
  // Game Logic
  MIN_YES_DECISIONS: 2,
  MIN_TOTAL_DECISIONS: 3,
  MAX_NOMINATIONS_PER_USER: 3,
  UNDERDOG_BOOST_THRESHOLD: 5,
  
  // Scheduling
  DEFAULT_FINISH_TIME: '03:30',
  BREAK_INTERVAL_MINUTES: 40,
  BREAK_DURATION_MINUTES: 15,
  
  // Auto-advance timing
  AUTO_ADVANCE_DELAY: 100,
  REVEAL_TO_DASHBOARD_DELAY: 10000,
  
  // User activity
  USER_ACTIVITY_UPDATE_INTERVAL: 30000,
  ACTIVE_USER_THRESHOLD_MINUTES: 5,
  
  // API
  TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  SEARCH_RESULTS_LIMIT: 10,
  TRENDING_MOVIES_LIMIT: 10,
  GENRE_MOVIES_LIMIT: 50,
  
  // Streaming Providers
  STREAMING_PROVIDERS: [
    { id: 8, name: 'Netflix', logo: '🎬' },
    { id: 119, name: 'Amazon Prime Video', logo: '📺' },
    { id: 350, name: 'Apple TV+', logo: '🍎' },
    { id: 337, name: 'Disney+', logo: '🏰' },
    { id: 384, name: 'HBO Max', logo: '🎭' },
    { id: 230, name: 'Crave', logo: '📡' }
  ],
  
  // Popular Genres
  POPULAR_GENRES: [
    { id: 28, name: 'Action' },
    { id: 35, name: 'Comedy' },
    { id: 18, name: 'Drama' },
    { id: 27, name: 'Horror' },
    { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' },
    { id: 10749, name: 'Romance' },
    { id: 16, name: 'Animation' }
  ]
} as const;

// Vote point values
export const VOTE_POINTS = {
  FIRST_PLACE: 3,
  SECOND_PLACE: 2,
  THIRD_PLACE: 1,
} as const;