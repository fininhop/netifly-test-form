// =======================================================
// FICHIER : api/delete-order.js (CODE SERVEUR VERCEL)
// Gère la suppression d'une commande Firestore
// =======================================================

const admin = require('firebase-admin');
const { augmentRes, ensureQuery, parseBody } = require('./_http');

// Initialisation de l'Admin SDK : seulement s'il n'est pas déjà initialisé
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        global.db = admin.firestore();
    } catch (e) {
        console.error("Erreur CRITIQUE d'initialisation Admin SDK:", e.message);
        global.adminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

// Le gestionnaire de la fonction Serverless Vercel
module.exports = async (req, res) => {
    augmentRes(res);
    ensureQuery(req);
    if (req.method !== 'GET' && req.method !== 'HEAD') await parseBody(req);
    // Vérification de l'erreur d'initialisation
    if (global.adminInitError) {
        return res.status(500).json({
            message: 'Erreur de configuration serveur. Clé de service Firebase invalide.',
            error: global.adminInitError.message
        });
    }

    // Vérification de la méthode
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Vérifier token admin
        const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
        const expected = process.env.ADMIN_TOKEN || null;
        if (!expected || provided !== expected) {
            return res.status(401).json({ message: 'Accès administrateur requis' });
        }

        const { orderId } = req.body || {};

        // Validation
        if (!orderId) {
            return res.status(400).json({ message: 'ID de commande requis' });
        }

        // Supprimer la commande
        await global.db.collection('orders').doc(orderId).delete();

        res.status(200).json({ message: 'Commande supprimée avec succès', orderId: orderId });

    } catch (error) {
        console.error('Erreur de suppression Firestore:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la commande.', error: error.message });
    }
};
