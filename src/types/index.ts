export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  isAdmin?: boolean;
}

export interface Movie {
  id: string;
  title: string;
  justwatch_id: string;
  poster_url: string;
  runtime: number;
  release_year: number;
  genre_names?: string[];
  short_description?: string;
  nomination_streak: number;
  added_at: Date;
}

export enum DailyState {
  WAITING_FOR_DECISIONS = 'WAITING_FOR_DECISIONS',
  GATHERING_NOMINATIONS = 'GATHERING_NOMINATIONS',
  GATHERING_VOTES = 'GATHERING_VOTES',
  REVEAL = 'REVEAL',
  DASHBOARD_VIEW = 'DASHBOARD_VIEW'
}

export interface DailyCycle {
  id: string; // Date string (YYYY-MM-DD)
  current_status: DailyState;
  decisions: Record<string, boolean>; // userId -> yes/no decision
  nominations: Record<string, string[]>; // userId -> array of movie IDs
  votes: Record<string, {
    top_pick: string;
    second_pick: string;
    third_pick: string;
  }>;
  winning_movie?: {
    movie_id: string;
    title: string;
    poster_url: string;
    runtime: number;
    release_year: number;
    score: number;
    start_time?: string;
  };
  schedule_settings: {
    finish_by_time: string;
  };
  created_at: Date;
}

export interface AppConfig {
  default_finish_time: string;
  underdog_boost_threshold: number;
  user_inactivity_timeout: number;
  break_interval_minutes: number;
  break_frequency_minutes: number;
  max_nominations_per_user: number;
}