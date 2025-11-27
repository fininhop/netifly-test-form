// /api/update-user.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    console.error('Erreur initialisation Admin SDK (update-user):', e.message);
  }
}
const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  const { userId, name, phone } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId requis' });
  try {
    const updates = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();
    await db.collection('users').doc(userId).update(updates);
    return res.status(200).json({ message: 'Profil mis à jour', updates });
  } catch (error) {
    console.error('Erreur update-user:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};