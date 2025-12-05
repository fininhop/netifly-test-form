// api/users.js
// Unified endpoint for all user operations

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
        }
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        global.db = admin.firestore();
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (users):', e.message);
        global.adminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

const db = global.db;

module.exports = async (req, res) => {
    if (global.adminInitError) {
        return res.status(500).json({ message: 'Erreur de configuration serveur (Firebase).', error: global.adminInitError.message });
    }

    const method = req.method;
    const { userId, name, email, phone, address, password, currentPassword, newPassword } = req.body || {};

    try {
        if (method === 'GET') {
            // GET /api/users: list all users
            const usersSnap = await db.collection('users').get();
            const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.status(200).json({ users });
        }
        if (method === 'POST') {
            // POST /api/users: create user
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
            }
            const normalizedEmail = String(email).trim().toLowerCase();
            const existing = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
            if (!existing.empty) {
                return res.status(409).json({ message: 'Cet email est déjà enregistré' });
            }
            const passwordHash = await bcrypt.hash(password, 10);
            const userData = {
                name: name.trim(),
                email: normalizedEmail,
                phone: phone ? String(phone).trim() : '',
                address: address ? String(address).trim() : '',
                passwordHash: passwordHash,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection('users').add(userData);
            return res.status(201).json({ message: 'Utilisateur créé', userId: docRef.id });
        }
        if (method === 'PATCH') {
            // PATCH /api/users: update user profile or password
            if (!userId) return res.status(400).json({ message: 'userId requis' });
            // Password change branch
            if (currentPassword && newPassword) {
                if (String(newPassword).length < 8) {
                    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
                }
                const userRef = db.collection('users').doc(userId);
                const snap = await userRef.get();
                if (!snap.exists) return res.status(404).json({ message: 'Utilisateur introuvable' });
                const data = snap.data();
                const matches = await bcrypt.compare(currentPassword, data.passwordHash);
                if (!matches) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
                const newHash = await bcrypt.hash(newPassword, 10);
                await userRef.update({ passwordHash: newHash, passwordChangedAt: admin.firestore.FieldValue.serverTimestamp() });
                return res.status(200).json({ message: 'Mot de passe mis à jour' });
            }
            // Profile update branch
            const updates = {};
            if (typeof name === 'string') updates.name = name.trim();
            if (typeof phone === 'string') updates.phone = phone.trim();
            if (typeof address === 'string') updates.address = address.trim();
            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
            }
            await db.collection('users').doc(userId).update(updates);
            return res.status(200).json({ message: 'Profil mis à jour', updates });
        }
        if (method === 'DELETE') {
            // DELETE /api/users: delete user
            if (!userId) return res.status(400).json({ message: 'userId requis' });
            // Optionally delete user's orders
            const ordersSnap = await db.collection('orders').where('userId', '==', userId).get();
            const batch = db.batch();
            ordersSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(db.collection('users').doc(userId));
            await batch.commit();
            return res.status(200).json({ message: 'Compte supprimé' });
        }
        // Special route: verify credentials
        if (method === 'POST' && (req.url.endsWith('/verify') || req.url.includes('/users/verify'))) {
            // POST /api/users/verify
            if (!email || !password) {
                return res.status(400).json({ message: 'Email et mot de passe requis' });
            }
            const normalizedEmail = String(email).trim().toLowerCase();
            const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
            if (snapshot.empty) {
                return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            }
            const doc = snapshot.docs[0];
            const userData = doc.data();
            const passwordMatch = await bcrypt.compare(password, userData.passwordHash);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            }
            const user = { ...userData };
            delete user.passwordHash;
            return res.status(200).json({ message: 'Connexion réussie', userId: doc.id, user });
        }
        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Erreur users:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
