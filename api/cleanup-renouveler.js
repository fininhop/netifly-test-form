// /api/cleanup-renouveler.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (cleanup-renouveler):', e.message);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const adminToken = req.headers['x-admin-token'] || req.headers['X-Admin-Token'];
        if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const batchSize = 200;
        const ordersSnap = await db.collection('orders').get();
        const FieldValue = admin.firestore.FieldValue;
        let updated = 0;

        const chunks = [];
        const docs = ordersSnap.docs;
        for (let i = 0; i < docs.length; i += batchSize) {
            chunks.push(docs.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach(d => {
                const data = d.data() || {};
                if (Object.prototype.hasOwnProperty.call(data, 'renouveler')) {
                    batch.update(d.ref, { renouveler: FieldValue.delete() });
                    updated += 1;
                }
            });
            if (updated > 0) {
                await batch.commit();
            }
        }

        return res.status(200).json({ message: 'Cleanup completed', removedCount: updated });
    } catch (error) {
        console.error('Erreur cleanup-renouveler:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
