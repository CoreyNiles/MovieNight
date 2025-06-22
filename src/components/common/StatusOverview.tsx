import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Film, Vote, Trophy } from 'lucide-react';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useActiveUsers } from '../../hooks/useActiveUsers';

export const StatusOverview: React.FC = () => {
  const { dailyCycle } = useDailyCycle();
  const { activeUsers } = useActiveUsers();

  if (!dailyCycle) return null;

  const decisions = Object.entries(dailyCycle.decisions);
  const yesDecisions = decisions.filter(([_, decision]) => decision === true);
  const nominations = Object.entries(dailyCycle.nominations);
  const votes = Object.entries(dailyCycle.votes);

  const getStatusMessage = () => {
    switch (dailyCycle.current_status) {
      case 'WAITING_FOR_DECISIONS':
        return `${yesDecisions.length} people want to watch • ${Math.max(0, 3 - decisions.length)} decisions needed`;
      case 'GATHERING_NOMINATIONS':
        return `${nominations.length} people nominated • ${Math.max(0, yesDecisions.length - nominations.length)} nominations needed`;
      case 'GATHERING_VOTES':
        return `${votes.length} people voted • ${Math.max(0, yesDecisions.length - votes.length)} votes needed`;
      case 'REVEAL':
        return 'Revealing tonight\'s winner!';
      case 'DASHBOARD_VIEW':
        return 'Movie night is ready!';
      default:
        return 'Getting ready...';
    }
  };

  const getProgressPercentage = () => {
    switch (dailyCycle.current_status) {
      case 'WAITING_FOR_DECISIONS':
        return (decisions.length / 3) * 100;
      case 'GATHERING_NOMINATIONS':
        return yesDecisions.length > 0 ? (nominations.length / yesDecisions.length) * 100 : 0;
      case 'GATHERING_VOTES':
        return yesDecisions.length > 0 ? (votes.length / yesDecisions.length) * 100 : 0;
      case 'REVEAL':
      case 'DASHBOARD_VIEW':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-lg rounded-lg p-4 mb-6 border border-white/10"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-white/80">
            <Users className="h-4 w-4" />
            <span className="text-sm">{activeUsers.length} active</span>
          </div>
          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
          <div className="flex items-center space-x-2 text-white/80">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-white text-sm font-medium">{getStatusMessage()}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-2">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${getProgressPercentage()}%` }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
        />
      </div>
    </motion.div>
  );
};