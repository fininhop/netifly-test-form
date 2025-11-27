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
        // Récupérer TOUTES les commandes sans ordre d'abord (pour compatibilité avec anciennes données)
        const snapshot = await global.db.collection('orders').get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            // Gérer les deux formats: nouveau (timestamp) et ancien (createdAt)
            const timeField = data.timestamp || data.createdAt;
            const createdAt = timeField ? timeField.toDate().toISOString() : null;
            
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                date: data.date, // Date de retrait
                // champ supprimé
                items: data.items,
                createdAt: createdAt,
            };
        }).sort((a, b) => {
            // Tri par date décroissante (les plus récentes d'abord)
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Succès : renvoyer le tableau d'objets 'orders'
        res.status(200).json({ orders });

    } catch (error) {
        console.error('Erreur de récupération Firestore (GET):', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de la récupération des commandes.',
            error: error.message 
        });
    }
};
