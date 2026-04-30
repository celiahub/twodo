import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function Signup({ onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // ✅ 1. 写入 Firebase Auth（关键）
      await updateProfile(user, {
        displayName: name.trim(),
      });

      // ✅ 2. 写入 Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: name.trim(),
        email,
        groupId: null,
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