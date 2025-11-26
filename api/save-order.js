// /api/save-order.js

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        // Le contenu de cette variable doit être le JSON de votre clé de service Firebase Admin
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); 
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        // Si cette étape plante (par exemple, la variable d'environnement n'est pas définie ou est mal formatée)
        console.error("Erreur critique d'initialisation Admin SDK:", e.message);
        // Cela provoquera l'erreur 500
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, date, seasonId, seasonName, renouveler, items, userId } = req.body;
        
        // Vérification minimale des données
        if (!name || !email || (!date && !seasonId) || !items || items.length === 0) {
            return res.status(400).json({ message: 'Données de commande incomplètes.' });
        }

        // Normaliser certains champs
        const normRenouveler = typeof renouveler === 'string'
            ? renouveler.toString().trim().toLowerCase()
            : (renouveler === true ? 'oui' : (renouveler === false ? 'non' : 'non'));

        const orderData = {
            name: (name || '').toString().trim(),
            email: (email || '').toString().trim().toLowerCase(),
            phone: (phone || '').toString().trim(),
            date: (date || '').toString().trim(), // Date de retrait/livraison souhaitée
            seasonId: seasonId || null, // ID de la saison
            seasonName: seasonName || null, // Nom de la saison
            renouveler: normRenouveler === 'oui' ? 'oui' : 'non',
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity
                // Le prix n'est pas stocké pour éviter les incohérences si le prix change
            })),
            userId: userId || null, // Associer la commande à un utilisateur enregistré
            timestamp: admin.firestore.FieldValue.serverTimestamp(), // Date d'enregistrement dans Firestore
        };

        const docRef = await db.collection('orders').add(orderData);

        res.status(201).json({ 
            message: 'Commande enregistrée avec succès', 
            orderId: docRef.id 
        });

    } catch (error) {
        console.error('Erreur Firestore:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de l\'enregistrement de la commande.',
            error: error.message 
        });
    }
};
