import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { enablePush } from '../lib/push';
import AddTask from './AddTask';
import TaskItem from './TaskItem';
import DailyTracker from './DailyTracker';

function cleanName(name) {
  if (!name) return 'User';
  if (name.includes('@')) return name.split('@')[0];
  return name;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  if (!value) return 'No date';
  return String(value).slice(0, 10);
}

function formatDate(dateKey) {
  if (dateKey === 'No date') return 'No date';

  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TaskList() {
  const { user, userDoc } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [presenceList, setPresenceList] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [openDates, setOpenDates] = useState({});

  const groupId = userDoc?.groupId;
  const today = getTodayDate();

  const myName = cleanName(
    userDoc?.displayName || user?.displayName || user?.email
  );

  useEffect(() => {
    if (!user || !groupId) return;

    setDoc(
      doc(db, 'presence', user.uid),
      {
        groupId,
        displayName: myName,
        online: true,
        currentAction: 'idle',
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  }, [user, groupId, myName]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'tasks'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [groupId]);

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

  const navItems = [
    'Dashboard',
    'Daily Route',
    'Tasks',
    'Calendar',
    'Messages',
    'Settings',
  ];

  const todayTasks = tasks.filter(
    (task) => normalizeDate(task.taskDate) === today
  );

  const pastTasksByDate = tasks
    .filter((task) => normalizeDate(task.taskDate) !== today)
    .reduce((acc, task) => {
      const dateKey = normalizeDate(task.taskDate);

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);

      return acc;
    }, {});

  const pastDates = Object.keys(pastTasksByDate).sort((a, b) =>
    b.localeCompare(a)
  );

  const renderDashboard = () => (
    <>
      <div className="online-card">
        {presenceList.map((p, i) => (
          <div key={i} className="online-user">
            <span className="dot" />
            {cleanName(p.displayName)} online
          </div>
        ))}
      </div>

      <DailyTracker tasks={tasks} user={user} />

      <AddTask groupId={groupId} />

      <div className="task-section">
        <h3>Today</h3>

        {todayTasks.length === 0 ? (
          <div className="daily-empty">No tasks for today yet.</div>
        ) : (
          todayTasks.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </div>

      <div className="past-task-section">
        {pastDates.map((dateKey) => {
          const dateTasks = pastTasksByDate[dateKey];
          const isOpen = openDates[dateKey];

          return (
            <div className="history-day" key={dateKey}>
              <button
                type="button"
                className="history-header"
                onClick={() =>
                  setOpenDates((prev) => ({
                    ...prev,
                    [dateKey]: !prev[dateKey],
                  }))
                }
              >
                <span>
                  {isOpen ? '▾' : '▸'} {formatDate(dateKey)}
                </span>

                <strong>{dateTasks.length} tasks</strong>
              </button>

              {isOpen && (
                <div className="history-task-body">
                  {dateTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <h2 className="logo">Twodo</h2>

          <nav className="nav">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                className={`nav-item ${activeTab === item ? 'active' : ''}`}
                onClick={() => setActiveTab(item)}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="profile">
          <div className="avatar">{myName[0]?.toUpperCase()}</div>

          <div>
            <div className="name">{myName}</div>
            <div className="status">Online</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h1>
            {activeTab === 'Dashboard' ? `Hello, ${myName}` : activeTab}
          </h1>

          <div className="topbar-actions">
            <button
              type="button"
              className="calendar-btn"
              onClick={() => enablePush(user, groupId)}
            >
              Enable Notifications
            </button>

            <button className="signout" onClick={() => signOut(auth)}>
              Sign out
            </button>
          </div>
        </div>

        {activeTab === 'Dashboard' && renderDashboard()}

        {activeTab === 'Daily Route' && (
          <DailyTracker tasks={tasks} user={user} />
        )}

        {activeTab === 'Tasks' && (
          <div className="task-section">
            <h3>All Tasks</h3>

            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}

        {activeTab === 'Calendar' && (
          <div className="empty-state">
            <p>Calendar coming soon.</p>
          </div>
        )}

        {activeTab === 'Messages' && (
          <div className="empty-state">
            <p>Messages coming soon.</p>
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="empty-state">
            <p>Settings coming soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}