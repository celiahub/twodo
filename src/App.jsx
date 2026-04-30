import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import CreateGroup from './components/CreateGroup';
import JoinGroup from './components/JoinGroup';
import TaskList from './components/TaskList';

export default function App() {
  const { user, userDoc, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login');
  const [groupMode, setGroupMode] = useState('create');

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return authMode === 'login'
      ? <Login onSwitch={() => setAuthMode('signup')} />
      : <Signup onSwitch={() => setAuthMode('login')} />;
  }

  if (!userDoc?.groupId) {
    return groupMode === 'create'
      ? <CreateGroup onSwitch={() => setGroupMode('join')} />
      : <JoinGroup onSwitch={() => setGroupMode('create')} />;
  }

  return <TaskList />;
}
