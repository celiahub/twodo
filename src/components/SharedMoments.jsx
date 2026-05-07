import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1400,
    useWebWorker: true,
  });
}

async function uploadToCloudinary(file) {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'twodo/shared-moments');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Upload failed');
  }

  return data.secure_url;
}

export default function SharedMoments({ user, groupId }) {
  const [moments, setMoments] = useState([]);
  const [openDates, setOpenDates] = useState({});

  const [seeText, setSeeText] = useState('');
  const [readText, setReadText] = useState('');
  const [hearText, setHearText] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const today = getTodayDate();

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'sharedMoments'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMoments(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, [groupId]);

  const submitMoment = async (type, text) => {
    if (!text.trim() && !imageFile) return;

    setUploading(true);

    try {
      let imageUrl = '';

      if (imageFile) {
        const compressed = await compressImage(imageFile);
        imageUrl = await uploadToCloudinary(compressed);
      }

      await addDoc(collection(db, 'sharedMoments'), {
        groupId,
        userId: user.uid,
        type,
        text,
        imageUrl,
        date: today,
        createdAt: serverTimestamp(),
      });

      setSeeText('');
      setReadText('');
      setHearText('');
      setImageFile(null);
    } catch (err) {
      alert(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const grouped = moments.reduce((acc, item) => {
    const date = item.date || 'No date';

    if (!acc[date]) acc[date] = [];

    acc[date].push(item);

    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <section className="shared-page">
      <div className="shared-card">
        <div className="health-header">
          <div>
            <p className="daily-label">Shared Moments</p>
            <h2>Sharing what I see, read, and hear</h2>
          </div>

          <span className="daily-pill">Daily connection</span>
        </div>

        <div className="shared-grid">
          <div className="shared-box">
            <h3>What I See</h3>

            <textarea
              placeholder="Something beautiful I saw today..."
              value={seeText}
              onChange={(e) => setSeeText(e.target.value)}
            />

            <label className="file-upload-btn">
              Upload image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImageFile(e.target.files[0])}
              />
            </label>

            <button
              className="shared-submit"
              onClick={() => submitMoment('see', seeText)}
              disabled={uploading}
            >
              Share
            </button>
          </div>

          <div className="shared-box">
            <h3>What I Read</h3>

            <textarea
              placeholder="A sentence, quote, article..."
              value={readText}
              onChange={(e) => setReadText(e.target.value)}
            />

            <button
              className="shared-submit"
              onClick={() => submitMoment('read', readText)}
              disabled={uploading}
            >
              Share
            </button>
          </div>

          <div className="shared-box">
            <h3>What I Hear</h3>

            <textarea
              placeholder="Music, sounds, words..."
              value={hearText}
              onChange={(e) => setHearText(e.target.value)}
            />

            <button
              className="shared-submit"
              onClick={() => submitMoment('hear', hearText)}
              disabled={uploading}
            >
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="daily-history">
        <h3>Past Shared Moments</h3>

        {dates.map((dateKey) => {
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

                <strong>{grouped[dateKey].length} shared</strong>
              </button>

              {isOpen && (
                <div className="shared-history-body">
                  {grouped[dateKey].map((item) => (
                    <div className="shared-history-item" key={item.id}>
                      <div className="shared-type">
                        {item.type === 'see' && '👀 What I See'}
                        {item.type === 'read' && '📖 What I Read'}
                        {item.type === 'hear' && '🎧 What I Hear'}
                      </div>

                      <p>{item.text}</p>

                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt="Shared moment"
                          className="shared-image"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}