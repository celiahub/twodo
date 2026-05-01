importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB...（你截图里的完整）",
  authDomain: "twodo-jonathan-celia.firebaseapp.com",
  projectId: "twodo-jonathan-celia",
  storageBucket: "twodo-jonathan-celia.appspot.com",
  messagingSenderId: "327081298786",
  appId: "1:327081298786:web:5814cf81927f190386fa3b"
});

const messaging = firebase.messaging();

// 👇 锁屏推送（隐藏内容版）
messaging.onBackgroundMessage(() => {
  self.registration.showNotification('Twodo', {
    body: 'You have a new update.',
    icon: '/icon-192.png'
  });
});