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

function Fireworks({ active }) {
  if (!active) return null;

  return (
    <div className="fireworks-layer">
      {Array.from({ length: 18 }).map((_, i) => (
        <span key={i} className={`firework-dot dot-${i + 1}`} />
      ))}
    </div>
  );
}

export default function SharedMoments({ user, groupId }) {
  const [moments, setMoments] = useState([]);
  const [openDates, setOpenDates] = useState({});
  const [openInput, setOpenInput] = useState('see');

  const [seeText, setSeeText] = useState('');
  const [readText, setReadText] = useState('');
  const [hearText, setHearText] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [heartLit, setHeartLit] = useState(false);
  const [fireworks, setFireworks] = useState(false);

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

  const playReward = () => {
    setHeartLit(true);
    setFireworks(true);

    setTimeout(() => {
      setFireworks(false);
    }, 1600);
  };

  const submitMoment = async (type, text) => {
    if (!text.trim() && !imageFile) return;
    if (!user || !groupId) return;

    setUploading(true);

    try {
      let imageUrl = '';

      if (type === 'see' && imageFile) {
        const compressed = await compressImage(imageFile);
        imageUrl = await uploadToCloudinary(compressed);
      }

      await addDoc(collection(db, 'sharedMoments'), {
        groupId,
        userId: user.uid,
        type,
        text: text.trim(),
        imageUrl,
        date: today,
        reward: 'heart',
        createdAt: serverTimestamp(),
      });

      setSeeText('');
      setReadText('');
      setHearText('');
      setImageFile(null);

      playReward();
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

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const renderInputPanel = (type) => {
    const isOpen = openInput === type;

    const config = {
      see: {
        title: 'What I See',
        subtitle: 'Share something you noticed today.',
        placeholder:
          'Something beautiful, funny, strange, or meaningful I saw today...',
        value: seeText,
        setValue: setSeeText,
        emoji: '👀',
      },
      read: {
        title: 'What I Read',
        subtitle: 'Save a quote, article, line, or thought.',
        placeholder: 'A sentence, quote, article, message, book line...',
        value: readText,
        setValue: setReadText,
        emoji: '📖',
      },
      hear: {
        title: 'What I Hear',
        subtitle: 'Share music, sounds, words, or a voice note idea.',
        placeholder: 'Music, sounds, words, something someone said...',
        value: hearText,
        setValue: setHearText,
        emoji: '🎧',
      },
    }[type];

    return (
      <div className="shared-toggle-card">
        <button
          type="button"
          className="shared-toggle-header"
          onClick={() => setOpenInput(isOpen ? '' : type)}
        >
          <span>
            {isOpen ? '▾' : '▸'} {config.emoji} {config.title}
          </span>
          <small>{config.subtitle}</small>
        </button>

        {isOpen && (
          <div className="shared-toggle-body">
            <textarea
              placeholder={config.placeholder}
              value={config.value}
              onChange={(e) => config.setValue(e.target.value)}
            />

            {type === 'see' && (
              <label className="file-upload-btn shared-upload-wide">
                {imageFile ? imageFile.name : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setImageFile(e.target.files[0])}
                />
              </label>
            )}

            <button
              type="button"
              className="shared-submit"
              onClick={() => submitMoment(type, config.value)}
              disabled={uploading}
            >
              {uploading ? 'Sharing...' : 'Share & light heart'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="shared-page">
      <Fireworks active={fireworks} />

      <div className="shared-card reward-card">
        <div className="health-header">
          <div>
            <p className="daily-label">Sharing</p>
            <h2>Sharing what I see, read, and hear</h2>
          </div>

          <span className="daily-pill">Grateful Daily</span>
        </div>

        <div className={`reward-heart ${heartLit ? 'lit' : ''}`}>
          ❤
        </div>

        <div className="shared-toggle-list">
          {renderInputPanel('see')}
          {renderInputPanel('read')}
          {renderInputPanel('hear')}
        </div>
      </div>

      <div className="daily-history">
        <h3>Past Sharing</h3>

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