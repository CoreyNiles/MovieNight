import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Play, Settings, Bell, Tv, MapPin, CheckCircle } from 'lucide-react';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useAuth } from '../../hooks/useAuth';
import { useAppConfig } from '../../hooks/useAppConfig';
import { NavigationHeader } from '../common/NavigationHeader';
import { format, addMinutes } from 'date-fns';
import { CONSTANTS } from '../../constants';
import toast from 'react-hot-toast';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { sharedMovies } = useSharedMovies();
  const { dailyCycle } = useDailyCycle();
  const { config } = useAppConfig();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [remindersSet, setRemindersSet] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showNotificationMessage, setShowNotificationMessage] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission);
      
      // Show message if notifications are denied
      if (permission === 'denied') {
        setShowNotificationMessage(true);
      }
    }
  }, []);

  // Automatically set reminders when dashboard loads
  useEffect(() => {
    if (dailyCycle?.winning_movie && !remindersSet) {
      const today = dailyCycle.id;
      const alarmFlag = `alarms_set_for_${today}`;
      
      // Check if alarms were already set today
      const alarmsAlreadySet = localStorage.getItem(alarmFlag);
      
      if (!alarmsAlreadySet) {
        setUpAutomaticReminders(today, alarmFlag);
      } else {
        setRemindersSet(true);
      }
    }
  }, [dailyCycle?.winning_movie, remindersSet]);

  const setUpAutomaticReminders = async (today: string, alarmFlag: string) => {
    const schedule = calculateSchedule();
    if (!schedule) return;

    try {
      // Request notification permission if not already granted
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'denied') {
          setShowNotificationMessage(true);
        }
        
        if (permission === 'denied') {
          // Don't show toast here, the UI message will handle it
          return;
        }
      }

      if (Notification.permission === 'granted') {
        // Schedule all three reminders automatically
        const reminders = [
          {
            time: addMinutes(schedule.startTime, -30),
            title: 'Movie Night - 30 Minute Warning',
            message: `${schedule.movie.title} starts in 30 minutes! Get your snacks ready! 🍿`
          },
          {
            time: addMinutes(schedule.startTime, -5),
            title: 'Movie Night - 5 Minute Warning',
            message: `${schedule.movie.title} is about to start! Time to gather everyone! 🎬`
          },
          {
            time: schedule.startTime,
            title: 'Movie Night - Show Time!',
            message: `It's time for ${schedule.movie.title}! Lights, camera, action! 🎭`
          }
        ];

        let successCount = 0;
        
        reminders.forEach((reminder) => {
          const timeUntilReminder = reminder.time.getTime() - Date.now();
          
          if (timeUntilReminder > 0) {
            setTimeout(() => {
              if (Notification.permission === 'granted') {
                new Notification(reminder.title, {
                  body: reminder.message,
                  icon: '/movie-icon.svg',
                  badge: '/movie-icon.svg',
                  tag: `movie-reminder-${today}`,
                  requireInteraction: true
                });
              }
            }, timeUntilReminder);
            
            successCount++;
          }
        });

        if (successCount > 0) {
          // Mark alarms as set for today
          localStorage.setItem(alarmFlag, 'true');
          setRemindersSet(true);
          
          toast.success(`🔔 ${successCount} automatic reminders set for movie night!`, {
            duration: 4000,
            icon: '📱'
          });
        } else {
          toast.error('All reminder times have already passed for today.');
        }
      } else {
        toast.error('Notification permission is required for automatic reminders.');
      }
    } catch (error) {
      console.error('Error setting up automatic reminders:', error);
      toast.error('Failed to set up automatic reminders.');
    }
  };

  const scheduleManualAlarm = (time: Date, title: string, message: string) => {
    // For manual alarms, use notifications only
    if ('Notification' in window && Notification.permission === 'granted') {
      const timeUntilAlarm = time.getTime() - Date.now();
      if (timeUntilAlarm > 0) {
        setTimeout(() => {
          new Notification(title, {
            body: message,
            icon: '/movie-icon.svg',
            badge: '/movie-icon.svg',
            requireInteraction: true
          });
        }, timeUntilAlarm);
        toast.success(`📱 Notification set for ${format(time, 'h:mm a')}`);
      } else {
        toast.error('Cannot set reminder for past time');
      }
    } else {
      toast.error('Notifications must be enabled to set manual reminders');
    }
  };

  const calculateSchedule = () => {
    if (!dailyCycle?.winning_movie) return null;

    // Try to find the winning movie in shared movies
    const winningMovie = sharedMovies.find(m => m.id === dailyCycle.winning_movie?.movie_id);
    
    // If not found, use the data from the winning_movie object itself
    const movieToUse = winningMovie || {
      id: dailyCycle.winning_movie.movie_id,
      title: dailyCycle.winning_movie.title || 'Tonight\'s Selected Movie',
      poster_url: dailyCycle.winning_movie.poster_url || CONSTANTS.FALLBACK_POSTER_URL,
      runtime: dailyCycle.winning_movie.runtime || 120,
      release_year: dailyCycle.winning_movie.release_year || new Date().getFullYear(),
      genre_names: ['Drama'],
      short_description: 'The movie selected for tonight\'s viewing.',
      nomination_streak: 0,
      added_at: new Date(),
      justwatch_id: 'unknown',
      original_owner: 'unknown',
      shared_at: new Date()
    };

    const finishTime = dailyCycle.schedule_settings.finish_by_time;

    // Calculate total break time using config
    const numberOfBreaks = Math.floor(movieToUse.runtime / config.break_interval_minutes);
    const totalBreakTime = numberOfBreaks * config.break_frequency_minutes;
    const totalEventDuration = movieToUse.runtime + totalBreakTime;

    // Parse times
    const [finishHour, finishMin] = finishTime.split(':').map(Number);

    // Use the cycle date as the base date for the movie night
    const cycleDate = new Date(dailyCycle.id + 'T00:00:00');
    let finishDateTime = new Date(cycleDate);
    finishDateTime.setHours(finishHour, finishMin, 0, 0);
    
    // If finish time is early morning (before noon), it's the next calendar day
    if (finishHour < 12) {
      finishDateTime.setDate(finishDateTime.getDate() + 1);
    }

    let startDateTime = new Date(finishDateTime.getTime() - totalEventDuration * 60000);

    return {
      movie: movieToUse,
      startTime: startDateTime,
      finishTime: finishDateTime,
      totalBreaks: numberOfBreaks,
      totalBreakTime,
      totalRuntime: movieToUse.runtime
    };
  };

  const schedule = calculateSchedule();

  if (!dailyCycle?.winning_movie || !schedule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <NavigationHeader currentScreen="DASHBOARD_VIEW" />
        
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">No movie selected yet</h1>
            <p className="text-white/70">Come back when voting is complete!</p>
          </div>
        </div>
      </div>
    );
  }

  const timeUntilStart = schedule.startTime.getTime() - currentTime.getTime();
  const isStartTime = timeUntilStart <= 0;

  // Get streaming providers for the winning movie
  const winningMovieDetails = sharedMovies.find(m => m.id === dailyCycle.winning_movie?.movie_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <NavigationHeader currentScreen="DASHBOARD_VIEW" />
      
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">Tonight's Movie Night</h1>
            <p className="text-white/80">Everything you need to know about tonight's show</p>
          </motion.div>

          {/* Automatic Reminders Status */}
          {remindersSet && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-6 text-center"
            >
              <div className="flex items-center justify-center space-x-2 text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">📱 Automatic reminders are set!</span>
              </div>
              <p className="text-green-300/80 text-sm mt-1">
                You'll receive phone notifications 30 minutes before, 5 minutes before, and at showtime
              </p>
            </motion.div>
          )}

          {/* Notification Permission Denied Message */}
          {showNotificationMessage && notificationPermission === 'denied' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-center space-x-2 text-yellow-300 mb-2">
                <Bell className="h-5 w-5" />
                <span className="font-semibold">Automatic reminders are disabled</span>
              </div>
              <p className="text-yellow-300/80 text-sm text-center">
                To enable them, please go to your phone's Settings → Apps → MovieNight → Notifications and allow notifications.
              </p>
              <button
                onClick={() => setShowNotificationMessage(false)}
                className="mt-3 mx-auto block text-yellow-300/60 hover:text-yellow-300 text-xs underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Movie Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20"
            >
              <div className="flex items-start space-x-6">
                <img
                  src={schedule.movie.poster_url}
                  alt={schedule.movie.title}
                  className="w-32 h-48 object-cover rounded-lg shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = CONSTANTS.FALLBACK_POSTER_URL;
                  }}
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-4">{schedule.movie.title}</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3 text-white/90">
                      <Calendar className="h-5 w-5" />
                      <span className="text-lg">{schedule.movie.release_year}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/90">
                      <Clock className="h-5 w-5" />
                      <span className="text-lg">{schedule.totalRuntime} minutes</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/90">
                      <Play className="h-5 w-5" />
                      <span className="text-lg">{schedule.totalBreaks} breaks ({schedule.totalBreakTime} min total)</span>
                    </div>
                  </div>

                  {/* Streaming Information */}
                  {winningMovieDetails && (
                    <div className="mb-6">
                      <h3 className="text-white font-semibold mb-2 flex items-center">
                        <Tv className="h-4 w-4 mr-2" />
                        Where to Watch
                      </h3>
                      <div className="flex items-center space-x-2 text-green-400 text-sm mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>Available in Canada</span>
                      </div>
                      <p className="text-white/70 text-sm">Check your favorite streaming service</p>
                    </div>
                  )}
                  
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-white/80 text-sm mb-1">Movie starts at</p>
                      <p className="text-3xl font-bold text-white">
                        {format(schedule.startTime, 'h:mm a')}
                      </p>
                      <p className="text-white/80 text-sm mt-1">
                        Finishes by {format(schedule.finishTime, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Countdown & Controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* Countdown */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 text-center">
                <h3 className="text-xl font-semibold text-white mb-4">
                  {isStartTime ? '🎬 It\'s Show Time!' : 'Time Until Movie Starts'}
                </h3>
                
                {!isStartTime ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Hours', value: Math.floor(timeUntilStart / (1000 * 60 * 60)) },
                      { label: 'Minutes', value: Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60)) },
                      { label: 'Seconds', value: Math.floor((timeUntilStart % (1000 * 60)) / 1000) }
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl font-bold text-white">{value.toString().padStart(2, '0')}</div>
                        <div className="text-white/70 text-sm">{label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    Ready to Start! 🍿
                  </div>
                )}
              </div>

              {/* Schedule Settings */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Schedule Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Finish By</label>
                    <input
                      type="time"
                      value={dailyCycle.schedule_settings.finish_by_time}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      readOnly
                    />
                  </div>
                  
                  <div className="bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg text-sm">
                    <strong>Break Schedule:</strong> {config.break_frequency_minutes} minutes every {config.break_interval_minutes} minutes
                  </div>
                </div>
              </div>

              {/* Manual Reminders (Backup Option) */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  {notificationPermission === 'granted' ? 'Additional Reminders' : 'Manual Reminders'}
                </h3>
                
                {notificationPermission === 'denied' && !showNotificationMessage && (
                  <div className="bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-sm mb-4">
                    <strong>Note:</strong> Notifications are disabled. Enable them in your phone settings to use reminders.
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={() => scheduleManualAlarm(
                      addMinutes(schedule.startTime, -30),
                      'Movie Night - 30 Minute Warning',
                      `${schedule.movie.title} starts in 30 minutes! Get your snacks ready! 🍿`
                    )}
                    disabled={notificationPermission !== 'granted'}
                    className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-white"
                  >
                    <span>30-minute warning</span>
                    <span className="text-white/70">{format(addMinutes(schedule.startTime, -30), 'h:mm a')}</span>
                  </button>
                  
                  <button
                    onClick={() => scheduleManualAlarm(
                      addMinutes(schedule.startTime, -5),
                      'Movie Night - 5 Minute Warning',
                      `${schedule.movie.title} is about to start! Time to gather everyone! 🎬`
                    )}
                    disabled={notificationPermission !== 'granted'}
                    className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-white"
                  >
                    <span>5-minute warning</span>
                    <span className="text-white/70">{format(addMinutes(schedule.startTime, -5), 'h:mm a')}</span>
                  </button>
                  
                  <button
                    onClick={() => scheduleManualAlarm(
                      schedule.startTime,
                      'Movie Night - Show Time!',
                      `It's time for ${schedule.movie.title}! Lights, camera, action! 🎭`
                    )}
                    disabled={notificationPermission !== 'granted'}
                    className="w-full flex justify-between items-center bg-purple-500/30 hover:bg-purple-500/40 p-3 rounded-lg transition-colors text-white font-semibold"
                  >
                    <span>Show time!</span>
                    <span className="text-white/90">{format(schedule.startTime, 'h:mm a')}</span>
                  </button>
                </div>
                
                <p className="text-white/60 text-xs mt-3 text-center">
                  {notificationPermission === 'granted' 
                    ? 'Click any reminder to set an additional notification' 
                    : 'Enable notifications in your phone settings to use reminders'
                  }
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};