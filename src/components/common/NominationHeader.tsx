import React from 'react';
import { motion } from 'framer-motion';
import { Check, Film } from 'lucide-react';

interface NominationHeaderProps {
  selectedMovies: string[];
  maxSelections: number;
  onSubmit: () => void;
  onNoNominations: () => void;
  loading: boolean;
  hasSubmitted: boolean;
}

export const NominationHeader: React.FC<NominationHeaderProps> = ({
  selectedMovies,
  maxSelections,
  onSubmit,
  onNoNominations,
  loading,
  hasSubmitted
}) => {
  if (hasSubmitted) {
    return (
      <div className="flex items-center justify-center space-x-2 text-green-300">
        <Check className="h-5 w-5" />
        <span className="font-semibold">Nominations Submitted!</span>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg border-b border-white/10 sticky top-[80px] z-40">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Selection Counter */}
          <div className="flex items-center space-x-3">
            <Film className="h-5 w-5 text-purple-400" />
            <span className="text-white font-medium">
              {selectedMovies.length}/{maxSelections} selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSubmit}
              disabled={loading || selectedMovies.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : `Submit Nominations (${selectedMovies.length})`}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNoNominations}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-semibold border border-white/20 transition-all duration-200"
            >
              {loading ? 'Submitting...' : 'No Nominations'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};