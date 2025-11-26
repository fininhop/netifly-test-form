// api/get-orders-admin.js
// Retourne toutes les commandes; requiert en-tête `x-admin-token` correspondant à ADMIN_TOKEN (variable d'env)
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        global.db = admin.firestore();
    } catch (e) {
        console.error('Erreur initialisation Admin SDK:', e.message);
        global.adminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

module.exports = async (req, res) => {
    if (global.adminInitError) {
        return res.status(500).json({ message: 'Erreur de configuration serveur.', error: global.adminInitError.message });
    }

    // Vérifier le token admin
    const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
    const expected = process.env.ADMIN_TOKEN || null;
    if (!expected || provided !== expected) {
        return res.status(401).json({ message: 'Accès administrateur requis' });
    }

    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const snapshot = await global.db.collection('orders').get();
        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            const timeField = data.timestamp || data.createdAt;
            const createdAt = timeField ? (timeField.toDate ? timeField.toDate().toISOString() : new Date(timeField).toISOString()) : null;
            const rn = (data.renouveler == null ? '' : String(data.renouveler)).trim().toLowerCase();
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                date: data.date,
                seasonId: data.seasonId || null,
                seasonName: data.seasonName || null,
                renouveler: rn === 'oui' ? 'oui' : (rn === 'non' ? 'non' : 'non'),
                items: data.items,
                createdAt
            };
        }).sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.status(200).json({ orders });

    } catch (err) {
        console.error('Erreur get-orders-admin:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.', error: err.message });
    }
};
