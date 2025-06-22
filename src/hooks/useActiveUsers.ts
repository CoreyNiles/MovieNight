import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, query, where, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CONSTANTS } from '../constants';

interface ActiveUser {
  id: string;
  displayName: string;
  lastSeen: Date;
  isOnline: boolean;
}

export const useActiveUsers = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to users who have been active in the last 5 minutes
    const thresholdTime = new Date(Date.now() - CONSTANTS.ACTIVE_USER_THRESHOLD_MINUTES * 60 * 1000);
    
    const activeUsersRef = collection(db, 'activeUsers');
    const activeUsersQuery = query(
      activeUsersRef,
      where('lastSeen', '>=', Timestamp.fromDate(thresholdTime))
    );

    const unsubscribe = onSnapshot(activeUsersQuery, (snapshot) => {
      const users: ActiveUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          displayName: data.displayName,
          lastSeen: data.lastSeen.toDate(),
          isOnline: true
        });
      });
      setActiveUsers(users);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateLastSeen = async (userId: string) => {
    try {
      // Get user data first
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        await setDoc(doc(db, 'activeUsers', userId), {
          displayName: userDoc.data().displayName,
          lastSeen: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  };

  return { activeUsers, loading, updateLastSeen };
};