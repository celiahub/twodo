import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { db } from '../lib/firebase';

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const CLOUD_NAME = 'ddkzt5tan';
const UPLOAD_PRESET = 'twodo_upload';

async function compressImage(file) {
  return await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  });
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'twodo/health');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Cloudinary upload failed');

  return data.secure_url;
}

function emptyLog(date, groupId, userId) {
  return {
    date,
    groupId,
    userId,
    bloodPressure: {
      value: '',
      time: '',
      imageUrl: '',
    },
    drinks: {
      amount: '',
      type: 'Water',
      time: '',
    },
    meals: {
      breakfast: '',
      lunch: '',
      dinner: '',
      snack: '',
    },
    workout: {
      content: '',
      time: '',
      duration: '',
    },
    symptoms: {
      diarrhea: false,
      diarrheaCount: '',
      diarrheaTime: '',
      headache: false,
      musclePain: false,
      painLevel: '',
      notes: '',
    },
    updatedAt: serverTimestamp(),
  };
}

export default function HealthTracker({ groupId, user }) {
  const [logs, setLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);
  const [openDates, setOpenDates] = useState({});
  const [uploading, setUploading] = useState(false);

  const today = getTodayDate();
  const todayId = `${groupId}_${user?.uid}_${today}`;

  useEffect(() => {
    if (!groupId || !user) return;

    const q = query(
      collection(db, 'healthLogs'),
      where('groupId', '==', groupId),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setLogs(items);

      const current = items.find((item) => item.date === today);

      if (current) {
        setTodayLog(current);
      } else {
        const fresh = emptyLog(today, groupId, user.uid);
        setTodayLog(fresh);
        setDoc(doc(db, 'healthLogs', todayId), fresh, { merge: true });
      }
    });

    return () => unsubscribe();
  }, [groupId, user, today, todayId]);

  const updateTodayLog = async (patch) => {
    const nextLog = {
      ...todayLog,
      ...patch,
      updatedAt: serverTimestamp(),
    };

    setTodayLog(nextLog);
    await setDoc(doc(db, 'healthLogs', todayId), nextLog, { merge: true });
  };

  const updateNested = async (section, key, value) => {
    await updateTodayLog({
      [section]: {
        ...todayLog[section],
        [key]: value,
      },
    });
  };

  const handleBpImage = async (file) => {
    if (!file) return;

    setUploading(true);

    try {
      const compressed = await compressImage(file);
      const imageUrl = await uploadToCloudinary(compressed);
      await updateNested('bloodPressure', 'imageUrl', imageUrl);
    } catch (err) {
      alert(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (!todayLog) return null;

  const pastLogs = logs
    .filter((log) => log.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="health-page">
      <div className="health-card">
        <div className="health-header">
          <div>
            <p className="daily-label">Today Health</p>
            <h2>{formatDate(today)}</h2>
          </div>

          <span className="daily-pill">Daily log</span>
        </div>

        <div className="health-grid">
          <div className="health-box">
            <h3>Blood Pressure</h3>

            <input
              type="text"
              placeholder="120/80"
              value={todayLog.bloodPressure?.value || ''}
              onChange={(e) =>
                updateNested('bloodPressure', 'value', e.target.value)
              }
            />

            <input
              type="time"
              value={todayLog.bloodPressure?.time || ''}
              onChange={(e) =>
                updateNested('bloodPressure', 'time', e.target.value)
              }
            />

            <label className="file-upload-btn health-upload">
              {uploading ? 'Uploading...' : 'Upload BP image'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleBpImage(e.target.files[0])}
              />
            </label>

            {todayLog.bloodPressure?.imageUrl && (
              <img
                src={todayLog.bloodPressure.imageUrl}
                alt="Blood pressure"
                className="health-image"
              />
            )}
          </div>

          <div className="health-box">
            <h3>Water / Drinks</h3>

            <input
              type="number"
              placeholder="Amount"
              value={todayLog.drinks?.amount || ''}
              onChange={(e) => updateNested('drinks', 'amount', e.target.value)}
            />

            <input
              type="text"
              placeholder="Water, coffee, tea..."
              value={todayLog.drinks?.type || ''}
              onChange={(e) => updateNested('drinks', 'type', e.target.value)}
            />

            <input
              type="time"
              value={todayLog.drinks?.time || ''}
              onChange={(e) => updateNested('drinks', 'time', e.target.value)}
            />
          </div>

          <div className="health-box">
            <h3>Meals</h3>

            <input
              type="time"
              value={todayLog.meals?.breakfast || ''}
              onChange={(e) => updateNested('meals', 'breakfast', e.target.value)}
            />
            <small>Breakfast</small>

            <input
              type="time"
              value={todayLog.meals?.lunch || ''}
              onChange={(e) => updateNested('meals', 'lunch', e.target.value)}
            />
            <small>Lunch</small>

            <input
              type="time"
              value={todayLog.meals?.dinner || ''}
              onChange={(e) => updateNested('meals', 'dinner', e.target.value)}
            />
            <small>Dinner</small>

            <input
              type="time"
              value={todayLog.meals?.snack || ''}
              onChange={(e) => updateNested('meals', 'snack', e.target.value)}
            />
            <small>Snack</small>
          </div>

          <div className="health-box">
            <h3>Workout</h3>

            <input
              type="text"
              placeholder="Yoga, walk, gym..."
              value={todayLog.workout?.content || ''}
              onChange={(e) =>
                updateNested('workout', 'content', e.target.value)
              }
            />

            <input
              type="time"
              value={todayLog.workout?.time || ''}
              onChange={(e) => updateNested('workout', 'time', e.target.value)}
            />

            <input
              type="number"
              placeholder="Duration minutes"
              value={todayLog.workout?.duration || ''}
              onChange={(e) =>
                updateNested('workout', 'duration', e.target.value)
              }
            />
          </div>

          <div className="health-box">
            <h3>Symptoms</h3>

            <label className="health-check">
              <input
                type="checkbox"
                checked={todayLog.symptoms?.diarrhea || false}
                onChange={(e) =>
                  updateNested('symptoms', 'diarrhea', e.target.checked)
                }
              />
              Diarrhea
            </label>

            <input
              type="number"
              placeholder="Diarrhea count"
              value={todayLog.symptoms?.diarrheaCount || ''}
              onChange={(e) =>
                updateNested('symptoms', 'diarrheaCount', e.target.value)
              }
            />

            <input
              type="time"
              value={todayLog.symptoms?.diarrheaTime || ''}
              onChange={(e) =>
                updateNested('symptoms', 'diarrheaTime', e.target.value)
              }
            />

            <label className="health-check">
              <input
                type="checkbox"
                checked={todayLog.symptoms?.headache || false}
                onChange={(e) =>
                  updateNested('symptoms', 'headache', e.target.checked)
                }
              />
              Headache
            </label>

            <label className="health-check">
              <input
                type="checkbox"
                checked={todayLog.symptoms?.musclePain || false}
                onChange={(e) =>
                  updateNested('symptoms', 'musclePain', e.target.checked)
                }
              />
              Muscle pain
            </label>

            <input
              type="number"
              min="0"
              max="10"
              placeholder="Pain level 0-10"
              value={todayLog.symptoms?.painLevel || ''}
              onChange={(e) =>
                updateNested('symptoms', 'painLevel', e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Notes"
              value={todayLog.symptoms?.notes || ''}
              onChange={(e) =>
                updateNested('symptoms', 'notes', e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="daily-history">
        <h3>Health History</h3>

        {pastLogs.map((log) => {
          const isOpen = openDates[log.date];

          return (
            <div className="history-day" key={log.id}>
              <button
                type="button"
                className="history-header"
                onClick={() =>
                  setOpenDates((prev) => ({
                    ...prev,
                    [log.date]: !prev[log.date],
                  }))
                }
              >
                <span>
                  {isOpen ? '▾' : '▸'} {formatDate(log.date)}
                </span>

                <strong>View</strong>
              </button>

              {isOpen && (
                <div className="health-history-body">
                  <p>BP: {log.bloodPressure?.value || '-'}</p>
                  <p>BP time: {log.bloodPressure?.time || '-'}</p>

                  <p>
                    Drinks: {log.drinks?.amount || '-'} {log.drinks?.type || ''}
                    {log.drinks?.time ? ` at ${log.drinks.time}` : ''}
                  </p>

                  <p>
                    Meals: Breakfast {log.meals?.breakfast || '-'} · Lunch{' '}
                    {log.meals?.lunch || '-'} · Dinner{' '}
                    {log.meals?.dinner || '-'} · Snack{' '}
                    {log.meals?.snack || '-'}
                  </p>

                  <p>
                    Workout: {log.workout?.content || '-'} ·{' '}
                    {log.workout?.duration || '-'} min
                    {log.workout?.time ? ` at ${log.workout.time}` : ''}
                  </p>

                  <p>
                    Symptoms: Diarrhea{' '}
                    {log.symptoms?.diarrhea ? 'Yes' : 'No'}
                    {log.symptoms?.diarrheaCount
                      ? ` · ${log.symptoms.diarrheaCount} times`
                      : ''}
                    {log.symptoms?.diarrheaTime
                      ? ` at ${log.symptoms.diarrheaTime}`
                      : ''}
                  </p>

                  <p>
                    Pain: Headache {log.symptoms?.headache ? 'Yes' : 'No'} ·
                    Muscle pain {log.symptoms?.musclePain ? 'Yes' : 'No'}
                    {log.symptoms?.painLevel
                      ? ` · Level ${log.symptoms.painLevel}/10`
                      : ''}
                  </p>

                  <p>Notes: {log.symptoms?.notes || '-'}</p>

                  {log.bloodPressure?.imageUrl && (
                    <img
                      src={log.bloodPressure.imageUrl}
                      alt="Blood pressure"
                      className="health-image"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}