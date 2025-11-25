// /api/get-orders.js

try {
    // Utiliser la variable globale définie dans config.js
    firebase.initializeApp(firebaseConfig); 
    const db = firebase.firestore();
    const ordersCollection = db.collection("orders"); 
    console.log("Firebase et Firestore initialisés.");
} catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase:", error);
}

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const admin = require('firebase-admin');

// Vérifiez si l'application Firebase est déjà initialisée
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

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
