// /api/verify-user.js
// Vérifie l'email et le mot de passe d'un utilisateur pour la connexion

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (verify-user):', e.message);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email et mot de passe requis' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        // Rechercher l'utilisateur par email
        const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
        if (snapshot.empty) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const doc = snapshot.docs[0];
        const userData = doc.data();

        // Vérifier le mot de passe
        const passwordMatch = await bcrypt.compare(password, userData.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Succès - retourner l'utilisateur sans le passwordHash
        const user = { ...userData };
        delete user.passwordHash;

        return res.status(200).json({
            message: 'Connexion réussie',
            userId: doc.id,
            user: user
        });

    } catch (error) {
        console.error('Erreur verify-user:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
