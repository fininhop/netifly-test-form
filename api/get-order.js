// /api/get-orders.js

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

const db = admin.firestore(); // Utilisez admin.firestor

export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Récupérer les commandes triées par date de création (la plus récente d'abord)
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                email: data.email,
                phone: data.phone, // Ajout du téléphone
                date: data.date,
                renouveler: data.renouveler, // Ajout du renouvellement
                items: data.items,
                // Convertir le timestamp Firestore en chaîne ISO si disponible
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
            };
        });

        res.status(200).json({ orders });

    } catch (error) {
        console.error('Erreur Firestore:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de la récupération des commandes.',
            error: error.message 
        });
    }
};
