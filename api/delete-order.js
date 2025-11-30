// Runtime check for required environment variables
const requiredVars = ['FIREBASE_SERVICE_ACCOUNT', 'ADMIN_TOKEN'];
requiredVars.forEach(v => {
    if (!process.env[v]) {
        console.error(`[delete-order.js] Missing env variable: ${v}`);
    }
});
// =======================================================
// FICHIER : api/delete-order.js (CODE SERVEUR VERCEL)
// Gère la suppression d'une commande Firestore
// =======================================================

const admin = require('firebase-admin');

// Initialisation de l'Admin SDK : seulement s'il n'est pas déjà initialisé
if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.error('[delete-order.js] FIREBASE_SERVICE_ACCOUNT is missing from environment variables');
            throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
        }
        console.log('[delete-order.js] FIREBASE_SERVICE_ACCOUNT found, length:', process.env.FIREBASE_SERVICE_ACCOUNT.length);
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            // Fix private_key formatting for Firebase
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
            }
            console.log('[delete-order.js] Service account parsed successfully, private_key formatted');
        } catch (parseErr) {
            console.error('[delete-order.js] Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseErr.message);
            throw parseErr;
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        global.db = admin.firestore();
        console.log('[delete-order.js] Firebase Admin initialized, Firestore set');
    } catch (e) {
        console.error("[delete-order.js] Erreur CRITIQUE d'initialisation Admin SDK:", e.message);
        global.adminInitError = e;
    }
} else {
    global.db = admin.firestore();
    console.log('[delete-order.js] Firebase Admin already initialized, Firestore set');
}

// Le gestionnaire de la fonction Serverless Vercel
module.exports = async (req, res) => {
    // Vérification de l'erreur d'initialisation
    if (global.adminInitError) {
        console.error('[delete-order.js] Returning 500 due to adminInitError:', global.adminInitError.message);
        return res.status(500).json({
            message: 'Erreur de configuration serveur. Clé de service Firebase invalide.',
            error: global.adminInitError.message
        });
    }
    if (!global.db) {
        console.error('[delete-order.js] global.db is undefined before Firestore access');
        return res.status(500).json({ message: 'Firestore non initialisé' });
    }

    // Méthode requise
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { orderId, email } = req.body || {};

        // Validation
        if (!orderId) {
            return res.status(400).json({ message: 'ID de commande requis' });
        }

        const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
        const expected = process.env.ADMIN_TOKEN || null;
        const isAdmin = expected && provided === expected;

        const docRef = global.db.collection('orders').doc(String(orderId));
        const snap = await docRef.get();
        if (!snap.exists) {
            return res.status(404).json({ message: 'Commande introuvable' });
        }
        const order = snap.data();

        if (!isAdmin) {
            // Chemin utilisateur: ownership et règle des 48h
            if (!email) return res.status(400).json({ message: 'Email requis pour annulation utilisateur' });
            const ownerEmail = String(order.email || '').toLowerCase();
            if (ownerEmail !== String(email || '').toLowerCase()) {
                return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres commandes' });
            }
            const endDateStr = order.date || order.seasonEndDate;
            if (!endDateStr) return res.status(400).json({ message: 'Date de fin de saison inconnue' });
            const now = Date.now();
            const end = new Date(endDateStr).getTime();
            const diffHours = (end - now) / (1000*60*60);
            if (diffHours < 48) return res.status(400).json({ message: 'Annulation impossible: moins de 48h avant la fin de la saison' });
        }

        await docRef.delete();
        res.status(200).json({ ok: true, orderId });

    } catch (error) {
        console.error('Erreur de suppression Firestore:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la commande.', error: error.message });
    }
};
