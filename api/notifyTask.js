import admin from 'firebase-admin';
import { Resend } from 'resend';

function initAdmin() {
  if (admin.apps.length) return;

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initAdmin();

    const { groupId, senderId } = req.body;
    const db = admin.firestore();

    const usersSnap = await db
      .collection('users')
      .where('groupId', '==', groupId)
      .get();

    const receiverIds = [];
    const emails = [];

    usersSnap.forEach((userDoc) => {
      if (userDoc.id !== senderId) {
        receiverIds.push(userDoc.id);
        const data = userDoc.data();
        if (data.email) emails.push(data.email);
      }
    });

    const tokens = [];

    for (const uid of receiverIds) {
      const tokenDoc = await db.collection('pushTokens').doc(uid).get();

      if (tokenDoc.exists && tokenDoc.data().token) {
        tokens.push(tokenDoc.data().token);
      }
    }

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'Twodo',
          body: 'You have a new update.',
        },
        webpush: {
          notification: {
            title: 'Twodo',
            body: 'You have a new update.',
            icon: '/icon-192.png',
          },
        },
      });
    }

    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL && emails.length > 0) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: emails,
        subject: 'New Twodo update',
        html: '<p>You have a new update in Twodo.</p><p>Open Twodo to view it.</p>',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('notifyTask error:', err);
    return res.status(500).json({ error: err.message });
  }
}