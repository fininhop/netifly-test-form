// /api/delete-user.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Fix private_key formatting for Firebase
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    console.error('Erreur initialisation Admin SDK (delete-user):', e.message);
  }
}
const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId requis' });
  try {
    // Optionnel: supprimer aussi ses commandes
    const ordersSnap = await db.collection('orders').where('userId', '==', userId).get();
    const batch = db.batch();
    ordersSnap.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('users').doc(userId));
    await batch.commit();
    return res.status(200).json({ message: 'Compte supprimé' });
  } catch (error) {
    console.error('Erreur delete-user:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};