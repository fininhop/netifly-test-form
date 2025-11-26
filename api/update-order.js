// api/update-order.js
// Permet à un administrateur de mettre à jour certains champs d'une commande (PATCH semantics via POST body)
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

    // Autorisation admin
    const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
    const expected = process.env.ADMIN_TOKEN || null;
    if (!expected || provided !== expected) {
        return res.status(401).json({ message: 'Accès administrateur requis' });
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const { orderId, updates } = req.body || {};
        if (!orderId) return res.status(400).json({ message: 'orderId requis' });
        if (!updates || typeof updates !== 'object') return res.status(400).json({ message: 'updates requis' });

        // Interdire la modification de champs sensibles à discrétion (ex: userId)
        const forbidden = ['userId'];
        forbidden.forEach(f => delete updates[f]);

        // Normaliser 'renouveler' si fourni
        if (typeof updates.renouveler !== 'undefined') {
            const r = (updates.renouveler || '').toString().trim().toLowerCase();
            updates.renouveler = r === 'oui' ? 'oui' : (r === 'non' ? 'non' : 'non');
        }
        if (typeof updates.date !== 'undefined') {
            updates.date = (updates.date || '').toString().trim();
        }

        await global.db.collection('orders').doc(orderId).update(updates);

        res.status(200).json({ message: 'Commande mise à jour', orderId, updates });

    } catch (err) {
        console.error('Erreur update-order:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour.', error: err.message });
    }
};
