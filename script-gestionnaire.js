// =======================================================
// FICHIER : script-gestionnaire.js
// Gère l'affichage des commandes récupérées via l'API Vercel /api/get-orders
// =======================================================

// Définition du nom unique de l'application
const APP_NAME = 'CommandeDePain'; 

let db;
let ordersCollection;

// 1. Initialiser l'application avec un nom unique UNIQUEMENT si elle n'existe pas
if (!firebase.apps.some(app => app.name === APP_NAME)) {
    try {
        // Initialisation nommée
        firebase.initializeApp(firebaseConfig, APP_NAME);
        console.log(`Firebase initialisé avec succès sous le nom '${APP_NAME}'.`);
    } catch (error) {
        console.error("Erreur lors de l'initialisation de Firebase:", error);
    }
} 

// 2. Récupérer l'instance de l'application nommée pour Firestore
try {
    // Récupère l'instance de l'application nommée
    const appInstance = firebase.app(APP_NAME); 
    db = firebase.firestore(appInstance);
    ordersCollection = db.collection("orders"); 
    
    // Mettre à jour la ligne d'affichage d'erreur précédente
    // (L'ancienne ligne 'MonAppPain' était probablement une erreur de copier-coller)
    
} catch (error) {
    // C'est ici que l'erreur de connexion à Firestore sera capturée si elle existe
    console.error("Erreur lors de la récupération de l'instance de Firestore:", error);
}

// Rendre la fonction accessible globalement pour le bouton "Actualiser"
window.fetchOrders = async function() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    // Fonction pour le formatage de la date/heure
    function formatDateTime(isoString) {
        try {
            if (!isoString) return 'N/A';
            const date = new Date(isoString);
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return date.toLocaleDateString('fr-FR', options);
        } catch (e) {
            return isoString;
        }
    }

    loadingMessage.textContent = 'Chargement des commandes...';
    ordersTableBody.innerHTML = '';
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');

    try {
        const response = await fetch('/api/get-orders');

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Erreur HTTP ${response.status}`);
        }

        const result = await response.json();
        const orders = result.orders;

        loadingMessage.textContent = '';

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6">Aucune commande trouvée.</td></tr>';
            return;
        }

        // Construction du tableau HTML
        orders.forEach(order => {
            const row = ordersTableBody.insertRow();
            
            // Formatage de la liste des articles
            const itemsList = `<ul class="items-list">${order.items.map(item => 
                `<li><strong>${item.quantity}</strong> x ${item.name}</li>`
            ).join('')}</ul>`;

            row.insertCell(0).textContent = formatDateTime(order.createdAt);
            row.insertCell(1).textContent = order.name;
            // Combinaison Email et Téléphone
            row.insertCell(2).innerHTML = `Email: ${order.email}<br>Tél: ${order.phone || 'N/A'}`; 
            row.insertCell(3).textContent = order.date;
            row.insertCell(4).textContent = order.renouveler === 'oui' ? '✅ Oui' : '❌ Non';
            row.insertCell(5).innerHTML = itemsList;
        });

    } catch (error) {
        console.error('Erreur de connexion à l\'API:', error);
        loadingMessage.textContent = '';
        errorMessage.textContent = `Échec de la récupération des commandes : ${error.message}. Vérifiez les variables d'environnement Vercel/Firebase.`;
        errorMessage.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});
