import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function CommentSection({ taskId, groupId }) {
  const { user, userDoc } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'comments'), {
        taskId,
        groupId,
        text: text.trim(),
        createdBy: user.uid,
        createdByName: userDoc?.displayName || user.email || 'User',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'tasks', taskId), {
        commentCount: increment(1),
      });
      setText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comments-section">
      {comments.map((c) => (
        <div key={c.id} className="comment">
          <span className="comment-author">{c.createdByName}</span>
          <span className="comment-text">{c.text}</span>
        </div>
      ))}
      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !text.trim()}>
          ↑
        </button>
      </form>
    </div>
  );
}
