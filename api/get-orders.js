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
        // Récupérer les commandes triées par le champ 'timestamp' de l'enregistrement
        // Note: orderBy peut nécessiter un index Firestore pour plusieurs collections
        let query = global.db.collection('orders');
        
        try {
            query = query.orderBy('timestamp', 'desc');
        } catch (e) {
            // Si l'index n'existe pas, récupérer sans ordre
            console.warn('Index timestamp non disponible, récupération sans tri:', e.message);
        }
        
        const snapshot = await query.get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                date: data.date, // Date de retrait
                renouveler: data.renouveler, 
                items: data.items,
                // Conversion du Timestamp Firestore en chaîne ISO
                createdAt: data.timestamp ? data.timestamp.toDate().toISOString() : null,
            };
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
