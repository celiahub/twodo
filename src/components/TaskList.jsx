import PresenceStatus from './PresenceStatus';
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import TaskItem from './TaskItem';
import AddTask from './AddTask';

export default function TaskList() {
  const { user, userDoc } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !userDoc?.groupId) return;

    setDoc(
      doc(db, 'presence', user.uid),
      {
        groupId: userDoc.groupId,
        displayName: userDoc?.displayName || user.email || 'User',
        online: true,
        currentAction: 'idle',
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );

    getDoc(doc(db, 'groups', userDoc.groupId)).then((snap) => {
      if (snap.exists()) setGroupData(snap.data());
    });

    const q = query(
      collection(db, 'tasks'),
      where('groupId', '==', userDoc.groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      setDoc(
        doc(db, 'presence', user.uid),
        {
          online: false,
          currentAction: 'idle',
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      unsubscribe();
    };
  }, [user, userDoc?.groupId, userDoc?.displayName]);

  const copyCode = () => {
    if (!groupData?.inviteCode) return;
    navigator.clipboard.writeText(groupData.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="brand-sm">Twodo</h1>
          {groupData?.inviteCode && (
            <button className="invite-code-btn" onClick={copyCode}>
              {copied ? '✓ Copied!' : `Code: ${groupData.inviteCode}`}
            </button>
          )}
        </div>

        <div className="header-right">
          <span className="username">{userDoc?.displayName}</span>
          <button className="sign-out-btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>

      <main className="task-main">
        <PresenceStatus groupId={userDoc?.groupId} />
        <AddTask groupId={userDoc?.groupId} />

        {pending.length > 0 && (
          <section>
            {pending.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section>
            <p className="section-label">Done</p>
            {done.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </section>
        )}

        {tasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks yet.</p>
            <p>Add your first one above ↑</p>
          </div>
        )}
      </main>
    </div>
  );
}