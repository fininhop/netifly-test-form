// =======================================================
// FICHIER : api/get-orders.js (CODE SERVEUR VERCEL)
// Gère la récupération des commandes Firestore pour le gestionnaire.
// =======================================================

const admin = require('firebase-admin');

// Initialisation de l'Admin SDK : seulement s'il n'est pas déjà initialisé
if (!admin.apps.length) {
    try {
        // La clé de service est lue depuis la variable d'environnement Vercel
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Fix private_key formatting for Firebase
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        global.db = admin.firestore(); // Stocker l'instance de db globalement
    } catch (e) {
        console.error("Erreur CRITIQUE d'initialisation Admin SDK:", e.message);
        global.adminInitError = e; // Conserver l'erreur pour la renvoyer plus tard
    }
} else {
    global.db = admin.firestore();
}

// Le gestionnaire de la fonction Serverless Vercel
module.exports = async (req, res) => {
    // Vérification de l'erreur d'initialisation
    if (global.adminInitError) {
        return res.status(500).json({ 
            message: 'Erreur de configuration serveur. Clé de service Firebase invalide.',
            error: global.adminInitError.message
        });
    }
    
    // Vérification de la méthode
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Optionnel: sécuriser vue admin avec token
        const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
        const expected = process.env.ADMIN_TOKEN || null;
        const isAdmin = expected && provided === expected;
        // Récupérer TOUTES les commandes (compat historique)
        const snapshot = await global.db.collection('orders').get();

        const now = Date.now();
        const cutoffMs = now - 365 * 24 * 60 * 60 * 1000; // 12 mois
        const cutoffDate = new Date(cutoffMs);
        const toPurge = [];

        const recentEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            const timeField = data.timestamp || data.createdAt;
            let createdDate = null;
            if (timeField) {
                try { createdDate = timeField.toDate ? timeField.toDate() : new Date(timeField); } catch(_) { createdDate = null; }
            }
            const isOld = createdDate ? createdDate < cutoffDate : false;
            if (isOld) toPurge.push(doc.ref);
            return { doc, data, createdDate };
        }).filter(entry => !entry.createdDate || entry.createdDate >= cutoffDate);

        // Purge opportuniste (admin vue) : supprimer jusqu'à 10 anciennes commandes par appel
        if (toPurge.length) {
            const batchRefs = toPurge.slice(0, 10);
            try {
                await Promise.all(batchRefs.map(r => r.delete()));
                console.log(`[Retention] Purge admin: ${batchRefs.length} commandes >12 mois supprimées.`);
            } catch (purgeErr) {
                console.warn('[Retention] Échec purge commandes anciennes (admin):', purgeErr.message);
            }
        }

        const orders = recentEntries.map(entry => {
            const { doc, data, createdDate } = entry;
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                date: data.date,
                seasonId: isAdmin ? (data.seasonId || null) : undefined,
                seasonName: isAdmin ? (data.seasonName || null) : undefined,
                items: data.items,
                createdAt: createdDate ? createdDate.toISOString() : null
            };
        }).sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.status(200).json({ orders, retention: { purged: toPurge.length ? Math.min(10, toPurge.length) : 0, cutoff: cutoffDate.toISOString() } });

    } catch (error) {
        console.error('Erreur de récupération Firestore (GET):', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de la récupération des commandes.',
            error: error.message 
        });
    }
};
