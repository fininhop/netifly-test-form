// api/cancel-order.js — Annulation par l'utilisateur avec règle des 48h
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    global.db = admin.firestore();
  } catch (e) {
    console.error('Admin init error:', e);
    global.adminInitError = e;
  }
} else {
  global.db = admin.firestore();
}

module.exports = async (req, res) => {
  if (global.adminInitError) {
    return res.status(500).json({ message: 'Erreur configuration serveur', error: global.adminInitError.message });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  try {
    const { orderId, email } = req.body || {};
    if (!orderId || !email) {
      return res.status(400).json({ message: 'Paramètres manquants: orderId et email requis' });
    }
    const docRef = global.db.collection('orders').doc(String(orderId));
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Commande introuvable' });
    }
    const order = snap.data();
    // Ownership check
    const ownerEmail = String(order.email || '').toLowerCase();
    if (ownerEmail !== String(email || '').toLowerCase()) {
      return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres commandes' });
    }
    // 48h rule based on season end date stored in order.date
    const endDateStr = order.date || order.seasonEndDate;
    if (!endDateStr) {
      return res.status(400).json({ message: 'Date de fin de saison inconnue pour cette commande' });
    }
    const now = Date.now();
    const end = new Date(endDateStr).getTime();
    const diffHours = (end - now) / (1000 * 60 * 60);
    if (diffHours < 48) {
      return res.status(400).json({ message: 'Annulation impossible: moins de 48h avant la fin de la saison' });
    }
    await docRef.delete();
    return res.status(200).json({ ok: true, orderId });
  } catch (err) {
    console.error('cancel-order error:', err);
    return res.status(500).json({ message: 'Erreur interne du serveur', error: err.message });
  }
};
