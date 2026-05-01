import { getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, getMessagingInstance } from './firebase';

export async function enablePush(user, groupId) {
  if (!user || !groupId) return;

  if (!('Notification' in window)) {
    alert('Notifications are not supported on this device.');
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    alert('Notifications not allowed.');
    return;
  }

  const messaging = await getMessagingInstance();

  if (!messaging) {
    alert('Push is not supported on this browser.');
    return;
  }

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  });

  await setDoc(
    doc(db, 'pushTokens', user.uid),
    {
      userId: user.uid,
      groupId,
      token,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  alert('Notifications enabled.');
}