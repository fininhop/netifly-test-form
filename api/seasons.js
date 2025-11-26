// api/seasons.js - Gestion des saisons de commande

const adminOnly = require('../middleware/admin-only');

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Erreur critique d'initialisation Admin SDK:", e.message);
    }
}

const db = admin.firestore();

async function handler(req, res) {
    // Vérifier le token admin pour toutes les opérations
    if (!adminOnly(req, res)) return;

    const { method } = req;
    const { seasonId } = req.query;

    try {
        switch (method) {
            case 'GET':
                if (seasonId) {
                    // Récupérer une saison spécifique
                    const season = await getSeasonById(seasonId);
                    return res.status(200).json({ season });
                } else {
                    // Récupérer toutes les saisons
                    const seasons = await getAllSeasons();
                    return res.status(200).json({ seasons });
                }

            case 'POST':
                const { name, startDate, endDate, description } = req.body;
                if (!name || !startDate || !endDate) {
                    return res.status(400).json({ message: 'Nom, date de début et date de fin requis' });
                }

                const newSeason = await createSeason({ name, startDate, endDate, description });
                return res.status(201).json({ season: newSeason, message: 'Saison créée' });

            case 'PUT':
                if (!seasonId) {
                    return res.status(400).json({ message: 'ID de saison requis' });
                }

                const updatedSeason = await updateSeason(seasonId, req.body);
                return res.status(200).json({ season: updatedSeason, message: 'Saison mise à jour' });

            case 'DELETE':
                if (!seasonId) {
                    return res.status(400).json({ message: 'ID de saison requis' });
                }

                await deleteSeason(seasonId);
                return res.status(200).json({ message: 'Saison supprimée' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                return res.status(405).json({ message: 'Méthode non autorisée' });
        }
    } catch (error) {
        console.error('Erreur API saisons:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

module.exports = handler;

// Fonctions helper pour la base de données Firestore
async function getAllSeasons() {
    try {
        const seasonsRef = db.collection('seasons');
        const snapshot = await seasonsRef.orderBy('startDate', 'desc').get();

        const seasons = [];
        snapshot.forEach(doc => {
            seasons.push({ id: doc.id, ...doc.data() });
        });

        return seasons;
    } catch (error) {
        console.error('Erreur récupération saisons:', error);
        throw error;
    }
}

async function getSeasonById(seasonId) {
    try {
        const seasonRef = db.collection('seasons').doc(seasonId);
        const doc = await seasonRef.get();

        if (!doc.exists) {
            return null;
        }

        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Erreur récupération saison:', error);
        throw error;
    }
}

async function createSeason(seasonData) {
    try {
        const seasonsRef = db.collection('seasons');
        const docRef = await seasonsRef.add({
            ...seasonData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const newDoc = await docRef.get();
        return { id: docRef.id, ...newDoc.data() };
    } catch (error) {
        console.error('Erreur création saison:', error);
        throw error;
    }
}

async function updateSeason(seasonId, updates) {
    try {
        const seasonRef = db.collection('seasons').doc(seasonId);
        await seasonRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const updatedDoc = await seasonRef.get();
        return { id: seasonId, ...updatedDoc.data() };
    } catch (error) {
        console.error('Erreur mise à jour saison:', error);
        throw error;
    }
}

async function deleteSeason(seasonId) {
    try {
        await db.collection('seasons').doc(seasonId).delete();
        return true;
    } catch (error) {
        console.error('Erreur suppression saison:', error);
        throw error;
    }
}