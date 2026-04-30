import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateGroup({ onSwitch }) {
  const { user, userDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    setLoading(true);

    try {
      const groupId = crypto.randomUUID();

      await setDoc(doc(db, 'groups', groupId), {
        inviteCode: generateCode(),
        members: [user.uid],
        memberNames: {
          [user.uid]: userDoc?.displayName || user.email || 'User',
        },
        createdBy: user.uid,
        createdAt: new Date(),
      });

      await setDoc(
        doc(db, 'users', user.uid),
        { groupId },
        { merge: true }
      );
    } catch (err) {
      console.error('Create group error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1 className="brand">Twodo</h1>
      <p className="brand-sub">
        Create a shared list with one other person.
      </p>
      {error && <p className="error">{error}</p>}
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating…' : 'Create a Group'}
      </button>
      <p className="switch-link">
        Have an invite code?{' '}
        <button type="button" onClick={onSwitch}>
          Join a Group
        </button>
      </p>
    </div>
  );
}