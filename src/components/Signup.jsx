import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const DEFAULT_GROUP_ID = '97597304-fa12-443d-a86a-58221d3b16c6';

export default function Signup({ onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(user, {
        displayName: cleanName,
      });

      await setDoc(doc(db, 'users', user.uid), {
        displayName: cleanName,
        email: cleanEmail,
        groupId: DEFAULT_GROUP_ID,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      setError(
        err.message
          .replace('Firebase: ', '')
          .replace(/\(.*\)/, '')
          .trim()
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1 className="brand">Twodo</h1>
      <p className="brand-sub">Tasks for two.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="switch-link">
        Have an account?{' '}
        <button type="button" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </div>
  );
}