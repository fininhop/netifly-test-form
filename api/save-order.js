// /api/save-order.js

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        // Le contenu de cette variable doit être le JSON de votre clé de service Firebase Admin
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        // Fix private_key formatting for Firebase
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
        }
        
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
        const { name, email, phone, date, seasonId, seasonName, items, userId } = req.body;
        
        // Vérification minimale des données
        if (!name || !email || (!date && !seasonId) || !items || items.length === 0) {
            return res.status(400).json({ message: 'Données de commande incomplètes.' });
        }

        // Vérifier qu'au moins une saison existe avant d'accepter la commande
        try {
            const seasonsSnap = await db.collection('seasons').limit(1).get();
            if (seasonsSnap.empty) {
                return res.status(503).json({ message: 'Commande momentanément indisponible: aucune saison créée. Réessayez plus tard.' });
            }
        } catch (e) {
            console.error('Erreur vérification saisons:', e);
            return res.status(503).json({ message: 'Commande momentanément indisponible (vérification saisons). Réessayez plus tard.' });
        }

        // Champ supprimé définitivement

        const orderData = {
            name: (name || '').toString().trim(),
            email: (email || '').toString().trim().toLowerCase(),
            phone: (phone || '').toString().trim(),
            date: (date || '').toString().trim(), // Date de retrait/livraison souhaitée
            seasonId: seasonId || null, // ID de la saison
            seasonName: seasonName || null, // Nom de la saison
            // champ retiré
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: typeof item.price === 'number' ? item.price : undefined,
                unitWeight: typeof item.unitWeight === 'number' ? item.unitWeight : undefined
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
