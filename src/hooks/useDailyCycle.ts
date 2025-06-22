import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../config/firebase';
import { useSharedMovies } from './useSharedMovies';
import { useAppConfig } from './useAppConfig';
import { DailyCycle, DailyState } from '../types';
import { CONSTANTS, VOTE_POINTS } from '../constants';

const getCurrentCycleId = () => {
  const now = new Date();
  const hour = now.getHours();
  
  // If it's before 4 AM, use previous day
  if (hour < 4) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return format(yesterday, 'yyyy-MM-dd');
  }
  
  return format(now, 'yyyy-MM-dd');
};

export const useDailyCycle = () => {
  const [dailyCycle, setDailyCycle] = useState<DailyCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sharedMovies } = useSharedMovies();
  const { config } = useAppConfig();

  // Centralized winner calculation function
  const calculateWinner = (cycle: DailyCycle): any => {
    const scores: Record<string, number> = {};
    const allNominations = Object.values(cycle.nominations).flat();
    const uniqueMovieIds = [...new Set(allNominations)];

    // Initialize scores
    uniqueMovieIds.forEach(movieId => {
      scores[movieId] = 0;
    });

    // Calculate votes
    Object.values(cycle.votes).forEach(vote => {
      if (vote.top_pick) scores[vote.top_pick] = (scores[vote.top_pick] || 0) + VOTE_POINTS.FIRST_PLACE;
      if (vote.second_pick) scores[vote.second_pick] = (scores[vote.second_pick] || 0) + VOTE_POINTS.SECOND_PLACE;
      if (vote.third_pick) scores[vote.third_pick] = (scores[vote.third_pick] || 0) + VOTE_POINTS.THIRD_PLACE;
    });

    // Apply underdog boost
    uniqueMovieIds.forEach(movieId => {
      const movie = sharedMovies.find(m => m.id === movieId);
      if (movie && movie.nomination_streak >= config.underdog_boost_threshold) {
        // Add 1 to each vote received (underdog boost)
        Object.values(cycle.votes).forEach(vote => {
          if (vote.top_pick === movieId) scores[movieId] += 1;
          if (vote.second_pick === movieId) scores[movieId] += 1;
          if (vote.third_pick === movieId) scores[movieId] += 1;
        });
      }
    });

    // Find winner (highest score, then shortest runtime for ties)
    const sortedMovies = uniqueMovieIds
      .map(id => ({ 
        movie_id: id, 
        score: scores[id], 
        movie: sharedMovies.find(m => m.id === id),
        title: sharedMovies.find(m => m.id === id)?.title || 'Unknown Movie',
        poster_url: sharedMovies.find(m => m.id === id)?.poster_url || CONSTANTS.FALLBACK_POSTER_URL,
        runtime: sharedMovies.find(m => m.id === id)?.runtime || 120,
        release_year: sharedMovies.find(m => m.id === id)?.release_year || new Date().getFullYear()
      }))
      .filter(item => item.movie)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.runtime || 0) - (b.runtime || 0);
      });

    return sortedMovies.length > 0 ? {
      movie_id: sortedMovies[0].movie_id,
      title: sortedMovies[0].title,
      poster_url: sortedMovies[0].poster_url,
      runtime: sortedMovies[0].runtime,
      release_year: sortedMovies[0].release_year,
      score: sortedMovies[0].score
    } : null;
  };

  const checkAndAdvanceStatus = async (cycle: DailyCycle) => {
    const cycleRef = doc(db, 'dailyCycles', cycle.id);
    const decisions = Object.entries(cycle.decisions);
    const nominations = Object.entries(cycle.nominations);
    const votes = Object.entries(cycle.votes);
    
    // Count "yes" decisions
    const yesDecisions = decisions.filter(([_, decision]) => decision === true);
    
    console.log('Auto-advance check:', {
      status: cycle.current_status,
      decisions: decisions.length,
      yesDecisions: yesDecisions.length,
      nominations: nominations.length,
      votes: votes.length
    });
    
    try {
      switch (cycle.current_status) {
        case DailyState.WAITING_FOR_DECISIONS:
          // Auto-advance if we have enough decisions
          if (decisions.length >= CONSTANTS.MIN_TOTAL_DECISIONS) {
            if (yesDecisions.length >= CONSTANTS.MIN_YES_DECISIONS) {
              console.log('Auto-advancing to nominations - enough yes votes');
              await updateDoc(cycleRef, { current_status: DailyState.GATHERING_NOMINATIONS });
            } else {
              console.log('Not enough people want to watch tonight');
              // Could reset for tomorrow or show a message
            }
          }
          break;
          
        case DailyState.GATHERING_NOMINATIONS:
          // Auto-advance if all "yes" people have nominated
          // Use a more robust check: ensure we have nominations from all yes voters
          const yesUserIds = yesDecisions.map(([userId, _]) => userId);
          const nominationUserIds = nominations.map(([userId, _]) => userId);
          const allYesUsersNominated = yesUserIds.every(userId => nominationUserIds.includes(userId));
          
          console.log('Nomination check:', {
            yesUserIds,
            nominationUserIds,
            allYesUsersNominated,
            yesCount: yesUserIds.length,
            nominationCount: nominations.length
          });
          
          if (yesUserIds.length > 0 && allYesUsersNominated) {
            console.log('Auto-advancing to voting - all yes voters have nominated');
            await updateDoc(cycleRef, { current_status: DailyState.GATHERING_VOTES });
          }
          break;
          
        case DailyState.GATHERING_VOTES:
          // Auto-advance if all "yes" people have voted
          const yesVoterIds = yesDecisions.map(([userId, _]) => userId);
          const voteUserIds = votes.map(([userId, _]) => userId);
          const allYesUsersVoted = yesVoterIds.every(userId => voteUserIds.includes(userId));
          
          console.log('Voting check:', {
            yesVoterIds,
            voteUserIds,
            allYesUsersVoted,
            yesCount: yesVoterIds.length,
            voteCount: votes.length
          });
          
          if (yesVoterIds.length > 0 && allYesUsersVoted) {
            console.log('Auto-advancing to reveal - all yes voters have voted');
            const winner = calculateWinner(cycle);
            await updateDoc(cycleRef, { 
              current_status: DailyState.REVEAL,
              winning_movie: winner
            });
            
            // Auto-advance to dashboard after delay
            setTimeout(async () => {
              try {
                await updateDoc(cycleRef, { current_status: DailyState.DASHBOARD_VIEW });
              } catch (error) {
                console.error('Error auto-advancing to dashboard:', error);
              }
            }, CONSTANTS.REVEAL_TO_DASHBOARD_DELAY);
          }
          break;
      }
    } catch (error) {
      console.error('Error in auto-advance logic:', error);
    }
  };

  useEffect(() => {
    const cycleId = getCurrentCycleId();
    const cycleRef = doc(db, 'dailyCycles', cycleId);

    const unsubscribe = onSnapshot(cycleRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const cycle: DailyCycle = {
            id: cycleId,
            current_status: data.current_status,
            decisions: data.decisions || {},
            nominations: data.nominations || {},
            votes: data.votes || {},
            winning_movie: data.winning_movie,
            schedule_settings: data.schedule_settings || {
              finish_by_time: CONSTANTS.DEFAULT_FINISH_TIME
            },
            created_at: data.created_at.toDate()
          };

          setDailyCycle(cycle);
          setLoading(false);
        } else {
          // Create new daily cycle
          const newCycle: Omit<DailyCycle, 'id'> = {
            current_status: DailyState.WAITING_FOR_DECISIONS,
            decisions: {},
            nominations: {},
            votes: {},
            schedule_settings: {
              finish_by_time: CONSTANTS.DEFAULT_FINISH_TIME
            },
            created_at: new Date()
          };
          
          await setDoc(cycleRef, newCycle);
        }
      } catch (err) {
        console.error('Error in daily cycle listener:', err);
        setError('Failed to load daily cycle');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // CRITICAL FIX: Use useEffect to handle auto-advancement when dailyCycle changes
  // This ensures the check runs reliably after every database update
  useEffect(() => {
    if (dailyCycle) {
      // Add a small delay to ensure all database writes are complete
      const timer = setTimeout(() => {
        checkAndAdvanceStatus(dailyCycle);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [dailyCycle?.decisions, dailyCycle?.nominations, dailyCycle?.votes, dailyCycle?.current_status]);

  const updateCycleStatus = async (status: DailyState) => {
    try {
      const cycleId = getCurrentCycleId();
      await updateDoc(doc(db, 'dailyCycles', cycleId), {
        current_status: status
      });
    } catch (err) {
      console.error('Error updating cycle status:', err);
      throw err;
    }
  };

  const resetDailyCycle = async () => {
    try {
      const cycleId = getCurrentCycleId();
      const cycleRef = doc(db, 'dailyCycles', cycleId);
      
      // Use a transaction to ensure atomic reset
      await runTransaction(db, async (transaction) => {
        // Delete the current cycle document
        transaction.delete(cycleRef);
        
        // Create a fresh cycle
        const newCycle: Omit<DailyCycle, 'id'> = {
          current_status: DailyState.WAITING_FOR_DECISIONS,
          decisions: {},
          nominations: {},
          votes: {},
          schedule_settings: {
            finish_by_time: CONSTANTS.DEFAULT_FINISH_TIME
          },
          created_at: new Date()
        };
        
        transaction.set(cycleRef, newCycle);
      });
    } catch (err) {
      console.error('Error resetting daily cycle:', err);
      throw err;
    }
  };

  const makeDecision = async (userId: string, decision: boolean) => {
    try {
      const cycleId = getCurrentCycleId();
      await updateDoc(doc(db, 'dailyCycles', cycleId), {
        [`decisions.${userId}`]: decision
      });
    } catch (err) {
      console.error('Error making decision:', err);
      throw err;
    }
  };

  const submitNominations = async (userId: string, movieIds: string[]) => {
    try {
      const cycleId = getCurrentCycleId();
      await updateDoc(doc(db, 'dailyCycles', cycleId), {
        [`nominations.${userId}`]: movieIds
      });
    } catch (err) {
      console.error('Error submitting nominations:', err);
      throw err;
    }
  };

  const submitVote = async (userId: string, votes: { top_pick: string; second_pick: string; third_pick: string }) => {
    try {
      const cycleId = getCurrentCycleId();
      await updateDoc(doc(db, 'dailyCycles', cycleId), {
        [`votes.${userId}`]: votes
      });
    } catch (err) {
      console.error('Error submitting vote:', err);
      throw err;
    }
  };

  return {
    dailyCycle,
    loading,
    error,
    updateCycleStatus,
    resetDailyCycle,
    makeDecision,
    submitNominations,
    submitVote,
    calculateWinner
  };
};