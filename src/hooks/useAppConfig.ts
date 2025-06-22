import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppConfig } from '../types';
import { CONSTANTS } from '../constants';

export const useAppConfig = () => {
  const [config, setConfig] = useState<AppConfig>({
    default_finish_time: CONSTANTS.DEFAULT_FINISH_TIME,
    underdog_boost_threshold: CONSTANTS.UNDERDOG_BOOST_THRESHOLD,
    user_inactivity_timeout: CONSTANTS.ACTIVE_USER_THRESHOLD_MINUTES,
    break_interval_minutes: CONSTANTS.BREAK_INTERVAL_MINUTES,
    break_frequency_minutes: CONSTANTS.BREAK_DURATION_MINUTES,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configRef = doc(db, 'config', 'app-settings');
    
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        setConfig(data);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { config, loading };
};