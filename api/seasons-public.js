// api/seasons-public.js - Public read-only seasons endpoint
const admin = require('firebase-admin');
const { augmentRes, ensureQuery } = require('./_http');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error("Erreur d'initialisation Admin SDK (seasons-public):", e.message);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    augmentRes(res);
    ensureQuery(req);

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        const seasonsRef = db.collection('seasons');
        const snapshot = await seasonsRef.orderBy('startDate', 'desc').get();
        const seasons = [];
        snapshot.forEach(doc => seasons.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ seasons });
    } catch (error) {
        console.error('Erreur API seasons-public:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};
