// /api/find-user.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (find-user):', e.message);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const email = (req.query && req.query.email) ? String(req.query.email).trim().toLowerCase() : null;
        if (!email) return res.status(400).json({ message: 'Paramètre email requis' });

        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const doc = snapshot.docs[0];
        return res.status(200).json({ userId: doc.id, user: doc.data() });

    } catch (error) {
        console.error('Erreur find-user:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
