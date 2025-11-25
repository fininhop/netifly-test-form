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
        firebase.initializeApp(firebaseConfig, APP_NAME);
        console.log(`Firebase initialisé avec succès sous le nom '${APP_NAME}'.`);
    } catch (error) {
        console.error("Erreur lors de l'initialisation de Firebase:", error);
    }
} 

// 2. Récupérer l'instance de l'application nommée pour Firestore
try {
    // Récupère l'instance de l'application nommée 'MonAppPain'
    const appInstance = firebase.app(APP_NAME); 
    db = firebase.firestore(appInstance);
    ordersCollection = db.collection("orders"); 
} catch (error) {
    // Si l'application par défaut existe, mais que 'MonAppPain' n'existe pas, 
    // et que nous ne pouvons pas l'initialiser, cela peut être une erreur.
    console.error("Erreur lors de la récupération de l'instance de Firestore:", error);
}

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
    const form = document.getElementById('clientOrderForm');
    const statusMessage = document.getElementById('statusMessage');

    // Initialisation du total
    updateTotal();

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
            name: document.getElementById('clientName').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(), // Ajout du téléphone
            date: document.getElementById('orderDate').value,
            renouveler: document.querySelector('input[name="renouveler"]:checked').value, // Renouvellement
            items: items
        };

        // 3. Envoi à l'API Vercel
        try {
            const response = await fetch('/api/save-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            const result = await response.json();

            if (response.ok) {
                statusMessage.textContent = `Commande enregistrée avec succès ! ID: ${result.orderId}`;
                statusMessage.className = 'status-message success';
                form.reset();
                updateTotal(); // Réinitialise l'affichage du total
            } else {
                statusMessage.textContent = `Erreur lors de l'enregistrement: ${result.message || 'Erreur inconnue'}`;
                statusMessage.className = 'status-message error';
            }

        } catch (error) {
            console.error('Erreur de connexion à l\'API:', error);
            statusMessage.textContent = 'Erreur réseau. Veuillez réessayer.';
            statusMessage.className = 'status-message error';
        }
    });
});
