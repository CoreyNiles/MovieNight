import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Play, Settings, Bell } from 'lucide-react';
import { useDailyCycle } from '../../hooks/useDailyCycle';
import { useSharedMovies } from '../../hooks/useSharedMovies';
import { useAuth } from '../../hooks/useAuth';
import { NavigationHeader } from '../common/NavigationHeader';
import { format, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { sharedMovies } = useSharedMovies();
  const { dailyCycle } = useDailyCycle();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateSchedule = () => {
    if (!dailyCycle?.winning_movie) return null;

    // Try to find the winning movie in shared movies
    const winningMovie = sharedMovies.find(m => m.id === dailyCycle.winning_movie?.movie_id);
    
    // If not found, create a generic movie object
    const movieToUse = winningMovie || {
      id: dailyCycle.winning_movie.movie_id,
      title: 'Tonight\'s Selected Movie',
      poster_url: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400',
      runtime: 120, // Default runtime
      release_year: new Date().getFullYear(),
      genre_names: ['Drama'],
      short_description: 'The movie selected for tonight\'s viewing.',
      nomination_streak: 0,
      added_at: new Date(),
      justwatch_id: 'unknown',
      original_owner: 'unknown',
      shared_at: new Date()
    };

    const finishTime = dailyCycle.schedule_settings.finish_by_time;

    // Calculate total break time (15 min every 40 min)
    const numberOfBreaks = Math.floor(movieToUse.runtime / 40);
    const totalBreakTime = numberOfBreaks * 15;
    const totalEventDuration = movieToUse.runtime + totalBreakTime;

    // Parse times
    const [finishHour, finishMin] = finishTime.split(':').map(Number);

    const today = new Date();
    let finishDateTime = new Date(today);
    finishDateTime.setHours(finishHour, finishMin, 0, 0);
    
    // If finish time is early morning, it's next day
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

  const scheduleAlarm = (time: Date, title: string, message: string) => {
    // Try to use native device alarm APIs
    if ('serviceWorker' in navigator && 'Notification' in window) {
      // Request notification permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const timeUntilAlarm = time.getTime() - Date.now();
          if (timeUntilAlarm > 0) {
            setTimeout(() => {
              new Notification(title, {
                body: message,
                icon: '/movie-icon.svg',
                badge: '/movie-icon.svg'
              });
            }, timeUntilAlarm);
            toast.success(`Alarm set for ${format(time, 'h:mm a')}`);
          } else {
            toast.error('Cannot set alarm for past time');
          }
        } else {
          toast.error('Notification permission denied');
        }
      });
    } else {
      // Fallback: try to open calendar app or show instructions
      const calendarUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${time.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${title}
DESCRIPTION:${message}
END:VEVENT
END:VCALENDAR`;
      
      const link = document.createElement('a');
      link.href = calendarUrl;
      link.download = 'movie-reminder.ics';
      link.click();
      
      toast.success('Calendar event downloaded');
    }
  };

  const schedule = calculateSchedule();

  if (!dailyCycle?.winning_movie || !schedule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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
                    (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400';
                  }}
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-4">{schedule.movie.title}</h2>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-white/90">
                      <Calendar className="h-5 w-5" />
                      <span>{schedule.movie.release_year}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/90">
                      <Clock className="h-5 w-5" />
                      <span>{schedule.totalRuntime} minutes</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white/90">
                      <Play className="h-5 w-5" />
                      <span>{schedule.totalBreaks} breaks ({schedule.totalBreakTime} min total)</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4">
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
                    <strong>Break Schedule:</strong> 15 minutes every 40 minutes
                  </div>
                </div>
              </div>

              {/* Clickable Alarms */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Set Reminders
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => scheduleAlarm(
                      addMinutes(schedule.startTime, -30),
                      'Movie Night',
                      'The movie starts in 30 minutes!'
                    )}
                    className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-white"
                  >
                    <span>30-minute warning</span>
                    <span className="text-white/70">{format(addMinutes(schedule.startTime, -30), 'h:mm a')}</span>
                  </button>
                  
                  <button
                    onClick={() => scheduleAlarm(
                      addMinutes(schedule.startTime, -5),
                      'Movie Night',
                      'The movie is about to start!'
                    )}
                    className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-white"
                  >
                    <span>5-minute warning</span>
                    <span className="text-white/70">{format(addMinutes(schedule.startTime, -5), 'h:mm a')}</span>
                  </button>
                  
                  <button
                    onClick={() => scheduleAlarm(
                      schedule.startTime,
                      'Movie Night',
                      "It's time for the movie!"
                    )}
                    className="w-full flex justify-between items-center bg-purple-500/30 hover:bg-purple-500/40 p-3 rounded-lg transition-colors text-white font-semibold"
                  >
                    <span>Show time!</span>
                    <span className="text-white/90">{format(schedule.startTime, 'h:mm a')}</span>
                  </button>
                </div>
                
                <p className="text-white/60 text-xs mt-3 text-center">
                  Click any reminder to set an alarm on your device
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};