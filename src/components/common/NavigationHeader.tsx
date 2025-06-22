import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Users, Clock, Film, Vote, Trophy, Calendar, RotateCcw, FastForward } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { DailyCycle } from '../../types';
import toast from 'react-hot-toast';

interface NavigationHeaderProps {
  currentScreen: string;
  onScreenChange?: (screen: DailyCycle['current_status']) => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ currentScreen, onScreenChange }) => {
  const { user, logout } = useAuth();
  const { dailyCycle, updateCycleStatus, resetDailyCycle } = useDailyCycle();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleScreenChange = async (screen: DailyCycle['current_status']) => {
    if (onScreenChange) {
      onScreenChange(screen);
    } else {
      try {
        await updateCycleStatus(screen);
        toast.success(`Switched to ${getScreenLabel(screen)}`);
      } catch (error) {
        toast.error('Failed to change screen');
      }
    }
  };

  const handleReset = async () => {
    if (user?.email === 'coreyniles1992@gmail.com') {
      try {
        await resetDailyCycle();
        toast.success('Daily cycle reset successfully');
      } catch (error) {
        toast.error('Failed to reset daily cycle');
      }
    }
  };

  const handleForceAdvance = async () => {
    if (user?.email === 'coreyniles1992@gmail.com' && dailyCycle?.current_status === 'GATHERING_NOMINATIONS') {
      try {
        await updateCycleStatus('GATHERING_VOTES');
        toast.success('Forced advance to voting phase');
      } catch (error) {
        toast.error('Failed to force advance');
      }
    }
  };
  if (!user || !dailyCycle) return null;

  const getScreenIcon = (screen: string) => {
    switch (screen) {
      case 'WAITING_FOR_DECISIONS': return Clock;
      case 'GATHERING_NOMINATIONS': return Film;
      case 'GATHERING_VOTES': return Vote;
      case 'REVEAL': return Trophy;
      case 'DASHBOARD_VIEW': return Calendar;
      default: return Clock;
    }
  };

  const getScreenLabel = (screen: string) => {
    switch (screen) {
      case 'WAITING_FOR_DECISIONS': return 'Decisions';
      case 'GATHERING_NOMINATIONS': return 'Nominations';
      case 'GATHERING_VOTES': return 'Voting';
      case 'REVEAL': return 'Reveal';
      case 'DASHBOARD_VIEW': return 'Dashboard';
      default: return 'Unknown';
    }
  };

  const screens: DailyCycle['current_status'][] = [
    'WAITING_FOR_DECISIONS',
    'GATHERING_NOMINATIONS', 
    'GATHERING_VOTES',
    'REVEAL',
    'DASHBOARD_VIEW'
  ];

  const currentIndex = screens.indexOf(dailyCycle.current_status);

  return (
    <div className="bg-white/5 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="text-white">
              <p className="text-sm opacity-80">Welcome back,</p>
              <p className="font-semibold">{user.displayName}</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="hidden md:flex items-center space-x-2">
            {screens.map((screen, index) => {
              const Icon = getScreenIcon(screen);
              const isActive = screen === dailyCycle.current_status;
              const isCompleted = index < currentIndex;
              // Allow navigation to any screen - remove the restriction
              const isAccessible = true;

              return (
                <React.Fragment key={screen}>
                  <motion.button
                    whileHover={isAccessible ? { scale: 1.05 } : {}}
                    whileTap={isAccessible ? { scale: 0.95 } : {}}
                    onClick={() => isAccessible && handleScreenChange(screen)}
                    disabled={!isAccessible}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-purple-500 text-white shadow-lg' 
                        : isCompleted
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 cursor-pointer'
                        : isAccessible
                        ? 'bg-white/10 text-white/70 hover:bg-white/20 cursor-pointer'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{getScreenLabel(screen)}</span>
                  </motion.button>
                  {index < screens.length - 1 && (
                    <div className={`w-8 h-0.5 ${isCompleted ? 'bg-green-400' : 'bg-white/20'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Mobile Progress */}
          <div className="md:hidden text-center">
            <p className="text-white/80 text-sm">{getScreenLabel(dailyCycle.current_status)}</p>
            <p className="text-white/60 text-xs">{currentIndex + 1} of {screens.length}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Admin Reset Button */}
            {user.email === 'coreyniles1992@gmail.com' && (
              <>
                {dailyCycle.current_status === 'GATHERING_NOMINATIONS' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleForceAdvance}
                    className="flex items-center space-x-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-3 py-2 rounded-lg transition-colors border border-orange-500/30"
                    title="Admin: Force Advance to Voting"
                  >
                    <FastForward className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Force Advance</span>
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-lg transition-colors border border-red-500/30"
                  title="Admin: Reset Daily Cycle"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Reset</span>
                </motion.button>
              </>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};