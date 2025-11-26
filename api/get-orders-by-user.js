// api/get-orders-by-user.js
// Retourne les commandes pour un utilisateur donné (POST: { userId } ou { email })
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

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { userId, email } = req.body || {};
    if (!userId && !email) {
        return res.status(400).json({ message: 'userId ou email requis' });
    }

    try {
        let snapshot;
        // Si userId fourni, utiliser une requête indexée
        if (userId) {
            snapshot = await global.db.collection('orders').where('userId', '==', userId).get();
        } else {
            snapshot = await global.db.collection('orders').where('email', '==', email).get();
        }

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
        console.error('Erreur get-orders-by-user:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.', error: err.message });
    }
};
