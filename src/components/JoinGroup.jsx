import { useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function JoinGroup({ onSwitch }) {
  const { user, userDoc } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'groups'),
        where('inviteCode', '==', code.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('Invite code not found.');
        return;
      }
      const groupDoc = snap.docs[0];
      const groupData = groupDoc.data();
      if (groupData.members.includes(user.uid)) {
        setError('You are already in this group.');
        return;
      }
      if (groupData.members.length >= 2) {
        setError('This group is already full.');
        return;
      }
      await updateDoc(doc(db, 'groups', groupDoc.id), {
        members: arrayUnion(user.uid),
        [`memberNames.${user.uid}`]: userDoc.displayName,
      });
      await updateDoc(doc(db, 'users', user.uid), { groupId: groupDoc.id });
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1 className="brand">Twodo</h1>
      <p className="brand-sub">Join your partner's list.</p>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          placeholder="Enter invite code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          style={{ letterSpacing: '0.2em', textAlign: 'center' }}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading || code.length < 6}>
          {loading ? 'Joining…' : 'Join Group'}
        </button>
      </form>
      <p className="switch-link">
        No code?{' '}
        <button type="button" onClick={onSwitch}>
          Create a Group
        </button>
      </p>
    </div>
  );
}
