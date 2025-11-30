// api/get-orders-by-user.js
// Retourne les commandes pour un utilisateur donné (POST: { userId } ou { email })
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Fix private_key formatting for Firebase
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
        }
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
        const now = Date.now();
        const cutoffMs = now - 365 * 24 * 60 * 60 * 1000; // 12 mois
        const cutoffDate = new Date(cutoffMs);
        const toPurge = [];

        const recentOrders = snapshot.docs.map(doc => {
            const data = doc.data();
            const timeField = data.timestamp || data.createdAt; // Firestore Timestamp ou valeur historique
            let createdDate = null;
            if (timeField) {
                try { createdDate = timeField.toDate ? timeField.toDate() : new Date(timeField); } catch(_) { createdDate = null; }
            }
            const createdAtIso = createdDate ? createdDate.toISOString() : null;
            // Déterminer si ancien (>12 mois)
            const isOld = createdDate ? createdDate < cutoffDate : false;
            if (isOld) { toPurge.push(doc.ref); }
            return { doc, data, createdDate, createdAtIso };
        }).filter(entry => !entry.createdDate || entry.createdDate >= cutoffDate); // garder seulement récents ou sans date

        // Purge opportuniste: supprimer un petit lot d'anciens pour ne pas allonger la latence
        if (toPurge.length) {
            const batchRefs = toPurge.slice(0, 3); // limite 3 suppressions par appel
            try {
                await Promise.all(batchRefs.map(r => r.delete()));
                console.log(`[Retention] Purge utilisateur (${email||userId}): ${batchRefs.length} commandes >12 mois supprimées.`);
            } catch (purgeErr) {
                console.warn('[Retention] Échec purge commandes anciennes:', purgeErr.message);
            }
        }

        const orders = recentOrders.map(entry => {
            const { doc, data, createdAtIso } = entry;
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                date: data.date,
                items: Array.isArray(data.items) ? data.items.map(it => ({
                    ...it,
                    name: typeof it.name === 'string' ? it.name.trim() : it.name
                })) : [],
                createdAt: createdAtIso
            };
        }).sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.status(200).json({ orders, retention: { purged: toPurge.length ? Math.min(3, toPurge.length) : 0, cutoff: cutoffDate.toISOString() } });

    } catch (err) {
        console.error('Erreur get-orders-by-user:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.', error: err.message });
    }
};
