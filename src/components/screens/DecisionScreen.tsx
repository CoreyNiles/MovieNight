import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Users, Clock } from 'lucide-react';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useAuth } from '../../hooks/useAuth';
import { useActiveUsers } from '../../hooks/useActiveUsers';
import { NavigationHeader } from '../common/NavigationHeader';
import { StatusOverview } from '../common/StatusOverview';
import toast from 'react-hot-toast';

export const DecisionScreen: React.FC = () => {
  const { user } = useAuth();
  const { dailyCycle, makeDecision } = useDailyCycle();
  const { activeUsers, updateLastSeen } = useActiveUsers();
  const [loading, setLoading] = useState(false);

  // Update user's last seen timestamp every 30 seconds
  useEffect(() => {
    if (user) {
      updateLastSeen(user.id);
      const interval = setInterval(() => {
        updateLastSeen(user.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, updateLastSeen]);

  if (!user || !dailyCycle) return null;

  const handleDecision = async (decision: boolean) => {
    if (loading) return;
    
    setLoading(true);
    try {
      await makeDecision(user.id, decision);
      toast.success(decision ? "You're in for movie night!" : "Maybe next time!");
    } catch (error) {
      toast.error('Failed to submit decision');
    } finally {
      setLoading(false);
    }
  };

  const userDecisions = Object.entries(dailyCycle.decisions);
  const yesDecisions = userDecisions.filter(([_, decision]) => decision === true);
  const noDecisions = userDecisions.filter(([_, decision]) => decision === false);
  const totalActiveUsers = Math.max(activeUsers.length, 3); // Assume 3 people minimum
  const decisionsLeft = Math.max(0, totalActiveUsers - userDecisions.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <NavigationHeader currentScreen="WAITING_FOR_DECISIONS" />
      
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="max-w-2xl w-full">
          <StatusOverview />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-6">
              <Clock className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Movie Night Tonight?
            </h1>
            <p className="text-xl text-white/80">
              Let's see who's in for a movie night!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDecision(true)}
                disabled={loading || user.id in dailyCycle.decisions}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center space-y-4"
              >
                <ThumbsUp className="h-12 w-12" />
                <span>Yes, I'm in!</span>
                <span className="text-sm font-normal opacity-90">Count me in for movie night</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDecision(false)}
                disabled={loading || user.id in dailyCycle.decisions}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-8 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center space-y-4"
              >
                <ThumbsDown className="h-12 w-12" />
                <span>Not tonight</span>
                <span className="text-sm font-normal opacity-90">Maybe next time</span>
              </motion.button>
            </div>

            {user.id in dailyCycle.decisions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg">
                  <Users className="h-5 w-5" />
                  <span>Your decision has been recorded!</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Decision Status */}
          {userDecisions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 mb-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Decision Status ({userDecisions.length}/3)
              </h3>
              
              {/* Progress indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-white/70 mb-2">
                  <span>{yesDecisions.length} want to watch</span>
                  <span>{noDecisions.length} not tonight</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(userDecisions.length / 3) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                {userDecisions.map(([userId, decision]) => {
                  const activeUser = activeUsers.find(u => u.id === userId);
                  return (
                    <div key={userId} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                      <span className="text-white/90">
                        {activeUser?.displayName || `User ${userId.slice(0, 8)}...`}
                      </span>
                      <div className={`flex items-center space-x-2 ${decision ? 'text-green-400' : 'text-red-400'}`}>
                        {decision ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                        <span className="font-medium">{decision ? 'In' : 'Out'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {decisionsLeft > 0 && (
                <p className="text-white/70 text-sm mt-4 text-center">
                  Waiting for {decisionsLeft} more decision{decisionsLeft > 1 ? 's' : ''}...
                </p>
              )}

              {yesDecisions.length >= 2 && decisionsLeft === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 text-center"
                >
                  <div className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg">
                    🎉 Movie night is happening! Moving to nominations...
                  </div>
                </motion.div>
              )}

              {userDecisions.length >= 3 && yesDecisions.length < 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 text-center"
                >
                  <div className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg">
                    😔 Not enough people for movie night tonight. Try again tomorrow!
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};