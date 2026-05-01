import { useState } from 'react';
import {
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import CommentSection from './CommentSection';

function formatTaskDate(task) {
  if (task.taskDate) {
    return new Date(task.taskDate + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (task.createdAt?.toDate) {
    return task.createdAt.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return '';
}

function formatCreatedTime(task) {
  if (!task.createdAt?.toDate) return '';

  return task.createdAt.toDate().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function cleanName(name) {
  if (!name) return 'User';
  if (name.includes('@')) return name.split('@')[0];
  return name;
}

function openGoogleCalendar(task) {
  const dateKey =
    task.taskDate ||
    task.createdAt?.toDate?.().toISOString().split('T')[0];

  if (!dateKey) {
    alert('This task does not have a date.');
    return;
  }

  const startDate = dateKey.replaceAll('-', '');

  const end = new Date(dateKey + 'T00:00:00');
  end.setDate(end.getDate() + 1);
  const endDate = end.toISOString().split('T')[0].replaceAll('-', '');

  const title = encodeURIComponent(task.text || 'Twodo Task');
  const details = encodeURIComponent(
    `Twodo task created by ${cleanName(task.createdByName || 'User')}`
  );

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;

  window.open(url, '_blank');
}

export default function TaskItem({ task }) {
  const { user, userDoc } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text || '');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const CLOUD_NAME = 'ddkzt5tan';
  const UPLOAD_PRESET = 'twodo_upload';

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
    formData.append('folder', 'twodo/proofs');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Cloudinary upload failed');
    }

    return data.secure_url;
  };

  const completeTask = async () => {
    if (!user) return;

    setUploading(true);

    try {
      let proofImageUrl = task.proofImageUrl || null;

      if (proofFile) {
        const compressed = await compressImage(proofFile);
        proofImageUrl = await uploadToCloudinary(compressed);
      }

      await updateDoc(doc(db, 'tasks', task.id), {
        done: true,
        doneBy: user.uid,
        doneByName: cleanName(userDoc?.displayName || user.email || 'User'),
        doneAt: serverTimestamp(),
        proofImageUrl,
        proofUploadedBy: proofFile ? user.uid : task.proofUploadedBy || null,
        proofUploadedAt: proofFile
          ? serverTimestamp()
          : task.proofUploadedAt || null,
      });

      await setDoc(
        doc(db, 'presence', user.uid),
        {
          groupId: task.groupId,
          displayName: cleanName(userDoc?.displayName || user.email || 'User'),
          online: true,
          currentAction: 'completed_task',
          lastTaskText: task.text,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProofFile(null);

      setTimeout(async () => {
        await setDoc(
          doc(db, 'presence', user.uid),
          {
            currentAction: 'idle',
            lastTaskText: '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }, 3000);
    } catch (err) {
      console.error('Complete task error:', err);
      alert(err.message || 'Could not complete task.');
    } finally {
      setUploading(false);
    }
  };

  const undoDone = async () => {
    await updateDoc(doc(db, 'tasks', task.id), {
      done: false,
      doneBy: null,
      doneByName: null,
      doneAt: null,
    });
  };

  const deleteProof = async () => {
    if (!window.confirm('Remove proof image?')) return;

    await updateDoc(doc(db, 'tasks', task.id), {
      proofImageUrl: null,
      proofUploadedBy: null,
      proofUploadedAt: null,
    });
  };

  const toggleLike = async () => {
    const hasLiked = task.likes?.includes(user.uid);

    await updateDoc(doc(db, 'tasks', task.id), {
      likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;

    await updateDoc(doc(db, 'tasks', task.id), {
      text: editText.trim(),
      done: false,
      doneBy: null,
      doneByName: null,
      doneAt: null,
      proofImageUrl: null,
      proofUploadedBy: null,
      proofUploadedAt: null,
      editedAt: serverTimestamp(),
    });

    setIsEditing(false);
  };

  const deleteTask = async () => {
    if (!window.confirm('Delete this task?')) return;
    await deleteDoc(doc(db, 'tasks', task.id));
  };

  const hasLiked = task.likes?.includes(user.uid);
  const likeCount = task.likes?.length ?? 0;
  const canEdit = task.createdBy === user.uid;

  const taskDateText = formatTaskDate(task);
  const createdTimeText = formatCreatedTime(task);
  const creatorName = cleanName(task.createdByName);

  return (
    <div className={`task-item${task.done ? ' task-done' : ''}`}>
      <div className="task-row">
        <button
          type="button"
          className={`check-btn${task.done ? ' checked' : ''}`}
          onClick={task.done ? undoDone : completeTask}
        >
          {task.done ? '✓' : ''}
        </button>

        <div className="task-content">
          {isEditing ? (
            <div className="edit-task-box">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <button type="button" onClick={saveEdit}>
                Save
              </button>
              <button type="button" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <p className={`task-text${task.done ? ' strikethrough' : ''}`}>
                {task.text}
              </p>

              {(taskDateText || createdTimeText || creatorName) && (
                <p className="task-date-meta">
                  {taskDateText}
                  {createdTimeText && ` · Created at ${createdTimeText}`}
                  {creatorName && ` · by ${creatorName}`}
                </p>
              )}

              {task.imageUrl && (
                <img src={task.imageUrl} alt="Task" className="task-image" />
              )}

              {task.proofImageUrl && (
                <div className="proof-box">
                  <div className="proof-header">
                    <p className="proof-label">Completion proof</p>

                    <button
                      type="button"
                      className="remove-proof-btn"
                      onClick={deleteProof}
                    >
                      Remove
                    </button>
                  </div>

                  <img
                    src={task.proofImageUrl}
                    alt="Completion proof"
                    className="task-image"
                  />
                </div>
              )}
            </>
          )}

          {task.done && task.doneByName ? (
            <p className="done-by">Done by {cleanName(task.doneByName)}</p>
          ) : null}

          {!task.done && (
            <div className="complete-box">
              <label className="attachment-btn">
                Attach proof
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setProofFile(e.target.files[0])}
                />
              </label>

              <button
                type="button"
                className="calendar-btn"
                onClick={() => openGoogleCalendar(task)}
              >
                Add to Google Calendar
              </button>

              {proofFile && (
                <div className="selected-proof-row">
                  <span className="proof-file-name">{proofFile.name}</span>
                  <button
                    type="button"
                    className="remove-proof-btn"
                    onClick={() => setProofFile(null)}
                  >
                    Remove
                  </button>
                </div>
              )}

              <button
                type="button"
                className="complete-btn"
                onClick={completeTask}
                disabled={uploading}
              >
                {uploading ? 'Completing...' : 'Complete'}
              </button>
            </div>
          )}
        </div>

        <div className="task-actions">
          {canEdit && (
            <>
              <button type="button" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              <button type="button" onClick={deleteTask}>
                Delete
              </button>
            </>
          )}

          <button
            type="button"
            className={`like-btn${hasLiked ? ' liked' : ''}`}
            onClick={toggleLike}
          >
            ♥{likeCount > 0 && <span>{likeCount}</span>}
          </button>

          <button
            type="button"
            className="comment-btn"
            onClick={() => setShowComments((v) => !v)}
          >
            💬{task.commentCount > 0 && <span>{task.commentCount}</span>}
          </button>
        </div>
      </div>

      {showComments && (
        <CommentSection taskId={task.id} groupId={task.groupId} />
      )}
    </div>
  );
}