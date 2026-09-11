'use strict';

/**
 * Seed Firestore from existing data.json
 * Usage: node seed-firestore.js
 *
 * Requires: serviceAccountKey.json in project root
 *           + data/data.json with existing data
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SA_PATH = path.join(__dirname, 'serviceAccountKey.json');
const DATA_PATH = path.join(__dirname, 'data', 'data.json');

if (!fs.existsSync(SA_PATH)) {
  console.error('\n  Missing serviceAccountKey.json\n');
  console.error('  Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key');
  console.error('  Place the file in: ' + __dirname + '\n');
  process.exit(1);
}

if (!fs.existsSync(DATA_PATH)) {
  console.error('  Missing data/data.json');
  process.exit(1);
}

const serviceAccount = require(SA_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const COLLECTIONS = [
  'users', 'categories', 'products', 'suppliers', 'customers',
  'transactions', 'orders', 'stockHistory',
];

async function seedCollection(name, items) {
  if (!Array.isArray(items) || !items.length) {
    console.log('  Skipping ' + name + ' (empty)');
    return;
  }
  const batch = firestore.batch();
  items.forEach((item) => {
    const ref = firestore.collection(name).doc(item.id);
    batch.set(ref, item);
  });
  await batch.commit();
  console.log('  Seeded ' + name + ': ' + items.length + ' docs');
}

async function seedSettings(settings) {
  if (!settings) return;
  await firestore.collection('settings').doc('main').set(settings);
  console.log('  Seeded settings');
}

async function main() {
  console.log('\n  Seeding Firestore from data.json...\n');

  for (const name of COLLECTIONS) {
    await seedCollection(name, data[name]);
  }
  await seedSettings(data.settings);

  console.log('\n  Done! Firestore is ready.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('  Seed failed:', err.message);
  process.exit(1);
});
