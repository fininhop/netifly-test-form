// =======================================================
// FICHIER : script-client.js
// Gère la logique de quantité, de calcul du total et la soumission
// de la commande à l'API Vercel (/api/save-order).
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

// ---------------------------------------------------------------------
// L'ANCIENNE INITIALISATION EN DOUBLE A ÉTÉ SUPPRIMÉE ICI.
// ---------------------------------------------------------------------


const PRICES = {
    'blanc_400g': 3.60, 'blanc_800g': 6.50, 'blanc_1kg': 7.00,
    'complet_400g': 3.60, 'complet_800g': 6.50, 'complet_1kg': 7.00,
    'cereale_400g': 4.60, 'cereale_800g': 8.50, 'cereale_1kg': 9.00,
    'epeautre_400g': 4.60, 'epeautre_800g': 8.50, 'epeautre_1kg': 9.00,
    'sarrazin': 7.00
};

const PRODUCT_NAMES = {
    'blanc_400g': 'Blanc 400g', 'blanc_800g': 'Blanc 800g', 'blanc_1kg': 'Blanc 1kg',
    'complet_400g': 'Complet 400g', 'complet_800g': 'Complet 800g', 'complet_1kg': 'Complet 1kg',
    'cereale_400g': 'Céréale 400g', 'cereale_800g': 'Céréale 800g', 'cereale_1kg': 'Céréale 1kg',
    'epeautre_400g': 'Épeautre 400g', 'epeautre_800g': 'Épeautre 800g', 'epeautre_1kg': 'Épeautre 1kg',
    'sarrazin': 'Sarrazin'
};

// Fonction pour modifier la quantité via les boutons +/-
window.changeQuantity = function(productId, change) {
    const input = document.getElementById(productId);
    const currentValue = parseInt(input.value) || 0;
    const newValue = Math.max(0, currentValue + change);
    input.value = newValue;
    updateTotal();
};

// Fonction de mise à jour du total
window.updateTotal = function() {
    let totalItems = 0;
    let totalPrice = 0;

    Object.keys(PRICES).forEach(productId => {
        const input = document.getElementById(productId);
        if (input) {
            const quantity = parseInt(input.value) || 0;
            totalItems += quantity;
            totalPrice += quantity * PRICES[productId];
        }
    });

    document.getElementById('total-price').textContent = totalPrice.toFixed(2);

    const basketInfo = document.getElementById('basket-info-message');
    if (totalItems > 0) {
        basketInfo.innerHTML = `${totalItems} produit(s) dans votre panier`;
        basketInfo.classList.remove('error');
        basketInfo.classList.add('success');
    } else {
        basketInfo.innerHTML = 'No product in your basket.';
        basketInfo.classList.remove('success');
        basketInfo.classList.add('error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Vérifier qu'un utilisateur est connecté/enregistré
    const stored = localStorage.getItem('currentUser');
    let currentUser = null;
    try { currentUser = stored ? JSON.parse(stored) : null; } catch (e) { currentUser = null; }

    if (!currentUser) {
        // Redirige vers la page de connexion si l'utilisateur n'est pas identifié
        window.location.href = 'index.html';
        return;
    }

    const form = document.getElementById('clientOrderForm');
    const statusMessage = document.getElementById('statusMessage');

    // Initialisation du total
    updateTotal();

    // Bouton déconnexion
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        statusMessage.textContent = '';
        statusMessage.className = 'status-message hidden';

        // 1. Collecte des articles commandés
        const items = [];
        let hasProducts = false;

        Object.keys(PRICES).forEach(productId => {
            const input = document.getElementById(productId);
            if (input) {
                const quantity = parseInt(input.value) || 0;
                if (quantity > 0) {
                    items.push({ 
                        name: PRODUCT_NAMES[productId], 
                        quantity: quantity, 
                        price: PRICES[productId] // Ajout du prix pour référence
                    });
                    hasProducts = true;
                }
            }
        });

        if (!hasProducts) {
            statusMessage.textContent = 'Veuillez sélectionner au moins un produit.';
            statusMessage.className = 'status-message error';
            return;
        }

        // 2. Création de l'objet de commande pour l'API
        const orderData = {
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            date: document.getElementById('orderDate').value,
            renouveler: document.querySelector('input[name="renouveler"]:checked').value, // Renouvellement
            items: items,
            userId: currentUser.userId || currentUser.id || null
        };

        // 3. Envoi à l'API Vercel
        try {
            const response = await fetch('/api/save-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            let result = null;
            try {
                result = await response.json();
            } catch (parseErr) {
                const text = await response.text().catch(() => '');
                try { result = JSON.parse(text); } catch { result = { message: text || 'Réponse serveur invalide' }; }
            }

            if (response.ok) {
                statusMessage.textContent = `Commande enregistrée avec succès ! ID: ${result.orderId}`;
                statusMessage.className = 'status-message success';
                form.reset();
                updateTotal(); // Réinitialise l'affichage du total
            } else {
                if (response.status >= 500) {
                    statusMessage.textContent = 'Erreur serveur. Réessayez plus tard.';
                } else {
                    statusMessage.textContent = `Erreur lors de l'enregistrement: ${result && result.message ? result.message : 'Erreur inconnue'}`;
                }
                statusMessage.className = 'status-message error';
            }

        } catch (error) {
            console.error('Erreur de connexion à l\'API:', error);
            statusMessage.textContent = 'Erreur réseau. Veuillez réessayer.';
            statusMessage.className = 'status-message error';
        }
    });
});
