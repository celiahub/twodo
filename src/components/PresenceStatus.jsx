import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function PresenceStatus({ groupId }) {
  const { user, userDoc } = useAuth();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!user || !groupId) return;

    const ref = doc(db, 'presence', user.uid);

    setDoc(
      ref,
      {
        groupId,
        displayName: userDoc?.displayName || user.email || 'User',
        online: true,
        currentAction: 'idle',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const handleOffline = () => {
      setDoc(
        ref,
        {
          online: false,
          currentAction: 'idle',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    };

    window.addEventListener('beforeunload', handleOffline);

    return () => {
      handleOffline();
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [user, userDoc, groupId]);

  useEffect(() => {
    if (!groupId || !user) return;

    const q = query(
      collection(db, 'presence'),
      where('groupId', '==', groupId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setMembers(list);
    });

    return unsub;
  }, [groupId, user]);

  return (
    <div className="presence-card">
      {members.map((member) => (
        <div
          key={member.id}
          className={`presence-row ${member.id === user.uid ? 'you' : ''}`}
        >
          <span className={`presence-dot ${member.online ? 'online' : 'offline'}`} />

          <span>
            {member.id === user.uid ? 'You' : member.displayName || 'Partner'}{' '}
            {member.online ? 'online' : 'offline'}
          </span>

          {member.currentAction === 'adding_task' && (
            <span className="presence-action">is adding a task...</span>
          )}

          {member.currentAction === 'completed_task' && (
            <span className="presence-action">just completed a task</span>
          )}
        </div>
      ))}
    </div>
  );
}