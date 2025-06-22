import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../config/firebase';
import { DailyCycle } from '../types';

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
              finish_by_time: '03:30'
            },
            created_at: data.created_at.toDate()
          };

          // Check for auto-advancement after setting the cycle
          setDailyCycle(cycle);
          
          // Auto-advance logic with proper timing
          setTimeout(() => {
            checkAndAdvanceStatus(cycle, cycleRef);
          }, 100);
        } else {
          // Create new daily cycle
          const newCycle: Omit<DailyCycle, 'id'> = {
            current_status: 'WAITING_FOR_DECISIONS',
            decisions: {},
            nominations: {},
            votes: {},
            schedule_settings: {
              finish_by_time: '03:30'
            },
            created_at: new Date()
          };
          
          await setDoc(cycleRef, newCycle);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error in daily cycle listener:', err);
        setError('Failed to load daily cycle');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const checkAndAdvanceStatus = async (cycle: DailyCycle, cycleRef: any) => {
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
    
    switch (cycle.current_status) {
      case 'WAITING_FOR_DECISIONS':
        // Auto-advance if we have at least 2 yes decisions and all decisions are in
        // OR if we have 3 decisions total (regardless of yes/no split)
        if ((yesDecisions.length >= 2 && decisions.length >= 3) || 
            (decisions.length >= 3 && yesDecisions.length >= 1)) {
          
          if (yesDecisions.length >= 2) {
            console.log('Auto-advancing to nominations - enough yes votes');
            try {
              await updateDoc(cycleRef, { current_status: 'GATHERING_NOMINATIONS' });
            } catch (error) {
              console.error('Failed to auto-advance to nominations:', error);
            }
          } else {
            console.log('Not enough people want to watch tonight');
            // Could reset for tomorrow or show a message
          }
        }
        break;
        
      case 'GATHERING_NOMINATIONS':
        // Auto-advance if all "yes" people have nominated
        if (yesDecisions.length > 0 && nominations.length >= yesDecisions.length) {
          console.log('Auto-advancing to voting - all nominations received');
          try {
            await updateDoc(cycleRef, { current_status: 'GATHERING_VOTES' });
          } catch (error) {
            console.error('Failed to auto-advance to voting:', error);
          }
        }
        break;
        
      case 'GATHERING_VOTES':
        // Auto-advance if all "yes" people have voted
        if (yesDecisions.length > 0 && votes.length >= yesDecisions.length) {
          console.log('Auto-advancing to reveal - all votes received');
          const winner = calculateWinner(cycle);
          try {
            await updateDoc(cycleRef, { 
              current_status: 'REVEAL',
              winning_movie: winner
            });
            
            // Auto-advance to dashboard after 10 seconds
            setTimeout(async () => {
              try {
                await updateDoc(cycleRef, { current_status: 'DASHBOARD_VIEW' });
              } catch (error) {
                console.error('Error auto-advancing to dashboard:', error);
              }
            }, 10000);
          } catch (error) {
            console.error('Failed to auto-advance to reveal:', error);
          }
        }
        break;
    }
  };

  const calculateWinner = (cycle: DailyCycle): any => {
    const scores: Record<string, number> = {};
    const allNominations = Object.values(cycle.nominations).flat();
    const uniqueMovieIds = [...new Set(allNominations)];

    // Initialize scores
    uniqueMovieIds.forEach(movieId => {
      scores[movieId] = 0;
    });

    // Calculate votes (3 points for 1st, 2 for 2nd, 1 for 3rd)
    Object.values(cycle.votes).forEach(vote => {
      if (vote.top_pick) scores[vote.top_pick] = (scores[vote.top_pick] || 0) + 3;
      if (vote.second_pick) scores[vote.second_pick] = (scores[vote.second_pick] || 0) + 2;
      if (vote.third_pick) scores[vote.third_pick] = (scores[vote.third_pick] || 0) + 1;
    });

    // Find winner (highest score)
    const sortedMovies = uniqueMovieIds
      .map(id => ({ movie_id: id, score: scores[id] }))
      .sort((a, b) => b.score - a.score);

    return sortedMovies[0] || null;
  };

  const updateCycleStatus = async (status: DailyCycle['current_status']) => {
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
      
      // Delete the current cycle document
      await deleteDoc(cycleRef);
      
      // Create a fresh cycle
      const newCycle: Omit<DailyCycle, 'id'> = {
        current_status: 'WAITING_FOR_DECISIONS',
        decisions: {},
        nominations: {},
        votes: {},
        schedule_settings: {
          finish_by_time: '03:30'
        },
        created_at: new Date()
      };
      
      await setDoc(cycleRef, newCycle);
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
    submitVote
  };
};