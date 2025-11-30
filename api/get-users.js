// /api/get-users.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Fix private_key formatting for Firebase
        if (serviceAccount.private_key) {
            // Remplacement robuste pour tous les formats Vercel
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
        }
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (get-users):', e.message);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const usersSnap = await db.collection('users').get();
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Return all users; clients can filter by name/email/phone locally
        return res.status(200).json({ users });

    } catch (error) {
        console.error('Erreur get-users:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
