import { useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
} from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDisplayName(user, userDoc) {
  return (
    userDoc?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'User'
  );
}

export default function AddTask({ groupId }) {
  const { user, userDoc } = useAuth();
  const [text, setText] = useState('');
  const [taskDate, setTaskDate] = useState(getTodayDate());
  const [file, setFile] = useState(null);
  const [stationType, setStationType] = useState('normal');
  const [repeatDaily, setRepeatDaily] = useState(false);
  const [loading, setLoading] = useState(false);

  const CLOUD_NAME = 'ddkzt5tan';
  const UPLOAD_PRESET = 'twodo_upload';

  const updatePresence = async (action, taskText = '') => {
    if (!user || !groupId) return;

    await setDoc(
      doc(db, 'presence', user.uid),
      {
        groupId,
        displayName: getDisplayName(user, userDoc),
        online: true,
        currentAction: action,
        currentTaskText: taskText,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const compressImage = async (file) => {
    return await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    });
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'twodo');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Cloudinary upload failed');
    }

    return data.secure_url;
  };

  const handleChange = async (e) => {
    const value = e.target.value;
    setText(value);

    if (value.trim()) {
      await updatePresence('adding_task', value.trim());
    } else {
      await updatePresence('idle', '');
    }
  };

  const sendTaskNotification = async (taskId, taskText) => {
    try {
      await fetch('/api/notifyTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          senderId: user.uid,
          taskId,
          taskText,
        }),
      });
    } catch (err) {
      console.error('Notify task error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim() && !file) return;
    if (!groupId || !user) return;

    setLoading(true);

    const taskText = text.trim();

    try {
      let imageUrl = null;

      if (file) {
        const compressed = await compressImage(file);
        imageUrl = await uploadToCloudinary(compressed);
      }

      const taskRef = await addDoc(collection(db, 'tasks'), {
        groupId,
        text: taskText,
        taskDate,
        imageUrl,

        stationType,
        stationTypeOwner: user.uid,
        repeatDaily,

        createdBy: user.uid,
        createdByName: getDisplayName(user, userDoc),
        createdAt: serverTimestamp(),
        done: false,
        doneBy: null,
        doneByName: null,
        doneAt: null,
        likes: [],
        commentCount: 0,
      });

      await sendTaskNotification(taskRef.id, taskText);

      setText('');
      setFile(null);
      setStationType('normal');
      setRepeatDaily(false);
      setTaskDate(getTodayDate());
      await updatePresence('idle', '');
    } catch (err) {
      console.error('Add task error:', err);
      alert(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <input
        id="task-input"
        name="task"
        type="text"
        placeholder="Add a task..."
        value={text}
        onChange={handleChange}
        disabled={loading}
      />

      <input
        id="task-date"
        name="taskDate"
        type="date"
        value={taskDate}
        onChange={(e) => setTaskDate(e.target.value)}
        disabled={loading}
      />

      <select
        value={stationType}
        onChange={(e) => setStationType(e.target.value)}
        disabled={loading}
        className="task-type-select"
        title="Only you can see this task type"
      >
        <option value="normal">Normal</option>
        <option value="heart">Heart ❤️</option>
        <option value="candy">Candy 🍬</option>
        <option value="kiss">Kiss 💋</option>
      </select>

      <label className="repeat-daily-toggle">
        <input
          type="checkbox"
          checked={repeatDaily}
          onChange={(e) => setRepeatDaily(e.target.checked)}
          disabled={loading}
        />
        <span>Repeat daily</span>
      </label>

      <label className="file-upload-btn">
        Choose file
        <input
          id="task-image"
          name="taskImage"
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files[0])}
          disabled={loading}
        />
      </label>

      <span className="file-name">{file ? file.name : 'No file chosen'}</span>

      <button type="submit" disabled={loading || (!text.trim() && !file)}>
        {loading ? '...' : '+'}
      </button>
    </form>
  );
}