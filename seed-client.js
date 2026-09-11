'use strict';

/**
 * Seed Firestore via Firebase Client SDK (no service account needed)
 *
 * PREREQUISITE: Anda harus:
 * 1. Buka Firebase Console → buat Firestore Database (kalau belum ada)
 * 2. Set Firestore Rules supaya bisa tulis:
 *
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /{document=**} {
 *          allow read, write: if true;
 *        }
 *      }
 *    }
 *
 * 3. Jalankan: node seed-client.js
 * 4. SELESAI SEED → balikin rules ke aman!
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, writeBatch } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: 'AIzaSyDZZvD0uvMzvThQDBGrfoL-4k4ZomyK4Nw',
  authDomain: 'kasir-ceyya.firebaseapp.com',
  projectId: 'kasir-ceyya',
  storageBucket: 'kasir-ceyya.firebasestorage.app',
  messagingSenderId: '311519586712',
  appId: '1:311519586712:web:5f626e5d0e59c6264863ed',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DATA_PATH = path.join(__dirname, 'data', 'data.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const COLLECTIONS = [
  'users', 'categories', 'products', 'suppliers', 'customers',
  'transactions', 'orders', 'stockHistory',
];

async function seedCollection(name, items) {
  if (!Array.isArray(items) || !items.length) {
    console.log('  Skipping ' + name + ' (empty)');
    return 0;
  }

  // Firestore batch max 500 ops
  const BATCH_SIZE = 500;
  let total = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + BATCH_SIZE);
    chunk.forEach((item) => {
      const ref = doc(collection(db, name), item.id);
      batch.set(ref, item);
    });
    await batch.commit();
    total += chunk.length;
  }

  console.log('  Seeded ' + name + ': ' + total + ' docs');
  return total;
}

async function seedSettings(settings) {
  if (!settings) return;
  await setDoc(doc(db, 'settings', 'main'), settings);
  console.log('  Seeded settings');
}

async function main() {
  console.log('\n  =========================================');
  console.log('   Seeding Firestore: kasir-ceyya');
  console.log('  =========================================\n');

  let totalDocs = 0;

  for (const name of COLLECTIONS) {
    const count = await seedCollection(name, data[name]);
    totalDocs += count;
  }

  await seedSettings(data.settings);

  console.log('\n  =========================================');
  console.log('   SELESAI! Total: ' + (totalDocs + 1) + ' dokumen');
  console.log('  =========================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n  SEED GAGAL:', err.message);
  console.error('\n  Pastikan:');
  console.error('  1. Firestore Database sudah dibuat di Firebase Console');
  console.error('  2. Firestore Rules sudah di-set allow read, write: if true;\n');
  process.exit(1);
});
