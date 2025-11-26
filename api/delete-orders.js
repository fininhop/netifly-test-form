// =======================================================
// FICHIER : api/delete-orders.js (CODE SERVEUR VERCEL)
// Gère la suppression de plusieurs commandes Firestore
// =======================================================

const admin = require('firebase-admin');

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
        const { orderIds } = req.body;

        // Validation
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ message: 'Tableau d\'IDs de commandes requis' });
        }

        // Supprimer les commandes en batch
        const batch = global.db.batch();
        orderIds.forEach(orderId => {
            const docRef = global.db.collection('orders').doc(orderId);
            batch.delete(docRef);
        });
        
        await batch.commit();

        res.status(200).json({
            message: `${orderIds.length} commande(s) supprimée(s) avec succès`,
            deletedCount: orderIds.length
        });

    } catch (error) {
        console.error('Erreur de suppression multiple Firestore:', error);
        res.status(500).json({
            message: 'Erreur interne du serveur lors de la suppression des commandes.',
            error: error.message
        });
    }
};
