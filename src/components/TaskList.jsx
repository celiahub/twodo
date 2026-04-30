import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import AddTask from './AddTask';
import TaskItem from './TaskItem';

export default function TaskList() {
  const { user, userDoc } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [presenceList, setPresenceList] = useState([]);

  const groupId = userDoc?.groupId;

  // ✅ 监听任务
  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'tasks'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })));
    });

    return () => unsubscribe();
  }, [groupId]);

  // ✅ 监听在线状态
  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'presence'),
      where('groupId', '==', groupId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPresenceList(snapshot.docs.map((doc) => doc.data()));
    });

    return () => unsubscribe();
  }, [groupId]);

  if (!userDoc) return null;

  return (
    <div className="layout">
      {/* ================= Sidebar ================= */}
      <aside className="sidebar">
        <h2 className="logo">Twodo</h2>

        <nav className="nav">
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">Tasks</div>
          <div className="nav-item">Calendar</div>
          <div className="nav-item">Messages</div>
          <div className="nav-item">Settings</div>
        </nav>

        {/* 👇 用户信息（底部） */}
        <div className="profile">
          <div className="avatar" />
          <div>
            <div className="name">
              {userDoc.displayName || 'You'}
            </div>
            <div className="status">Online</div>
          </div>
        </div>
      </aside>

      {/* ================= Main ================= */}
      <main className="main">
        <div className="topbar">
          <h1>Hello, {userDoc.displayName || 'User'}</h1>
        </div>

        {/* 👇 在线状态 */}
        <div className="online-card">
          {presenceList.map((p, i) => (
            <div key={i} className="online-user">
              <span className="dot" />
              {p.displayName} online
            </div>
          ))}
        </div>

        {/* 👇 添加任务 */}
        <AddTask groupId={groupId} />

        {/* 👇 任务列表 */}
        <div className="task-section">
          <h3>Today</h3>

          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </main>
    </div>
  );
}