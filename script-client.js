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

// Variables globales pour les saisons
let availableSeasons = [];

// Fonction pour charger les saisons disponibles
async function loadSeasons() {
    try {
        const response = await fetch('/api/seasons');
        const result = await response.json();

        if (response.ok && result.seasons) {
            availableSeasons = result.seasons;
            populateSeasonSelect();
        } else {
            console.error('Erreur chargement saisons:', result.message);
            showToast('Erreur', 'Impossible de charger les saisons disponibles.', 'error');
        }
    } catch (error) {
        console.error('Erreur réseau saisons:', error);
        showToast('Erreur réseau', 'Impossible de charger les saisons.', 'error');
    }
}

// Fonction pour remplir le sélecteur de saisons
function populateSeasonSelect() {
    const seasonSelect = document.getElementById('seasonSelect');
    if (!seasonSelect) return;

    // Garder seulement l'option par défaut
    seasonSelect.innerHTML = '<option value="">Sélectionnez une saison...</option>';

    // Ajouter les saisons actives
    const now = new Date();
    availableSeasons.forEach(season => {
        const startDate = new Date(season.startDate);
        const endDate = new Date(season.endDate);
        const isActive = now >= startDate && now <= endDate;

        const option = document.createElement('option');
        option.value = season.id;
        option.textContent = `${season.name} (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
        if (isActive) {
            option.textContent += ' - ACTIVE';
            option.selected = true; // Sélectionner automatiquement la saison active
        }

        seasonSelect.appendChild(option);
    });
}

const PRODUCT_NAMES = {
    'blanc_400g': 'Blanc 400g', 'blanc_800g': 'Blanc 800g', 'blanc_1kg': 'Blanc 1kg',
    'complet_400g': 'Complet 400g', 'complet_800g': 'Complet 800g', 'complet_1kg': 'Complet 1kg',
    'cereale_400g': 'Céréale 400g', 'cereale_800g': 'Céréale 800g', 'cereale_1kg': 'Céréale 1kg',
    'epeautre_400g': 'Épeautre 400g', 'epeautre_800g': 'Épeautre 800g', 'epeautre_1kg': 'Épeautre 1kg',
    'sarrazin': 'Sarrazin'
};

// Toast notification function
function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    // Reset classes
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white');
    
    // Apply type-specific styling
    if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'error' || type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning');
    } else {
        toastHeader.classList.add('bg-info', 'text-white');
    }
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

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
    const items = [];

    Object.keys(PRICES).forEach(productId => {
        const input = document.getElementById(productId);
        if (input) {
            const quantity = parseInt(input.value) || 0;
            if (quantity > 0) {
                totalItems += quantity;
                totalPrice += quantity * PRICES[productId];
                items.push({
                    name: PRODUCT_NAMES[productId],
                    quantity: quantity,
                    price: PRICES[productId],
                    total: quantity * PRICES[productId]
                });
            }
        }
    });

    document.getElementById('total-price').textContent = totalPrice.toFixed(2);

    const basketInfo = document.getElementById('basket-info-message');
    if (totalItems > 0) {
        basketInfo.innerHTML = `${totalItems} produit(s) dans votre panier`;
        basketInfo.classList.remove('alert-warning');
        basketInfo.classList.add('alert-info');
    } else {
        basketInfo.innerHTML = 'Aucun produit dans votre panier.';
        basketInfo.classList.remove('alert-info');
        basketInfo.classList.add('alert-warning');
    }

    // Update floating basket
    const floatingBasket = document.getElementById('floatingBasket');
    const floatCount = document.getElementById('floatBasketCount');
    const floatTotal = document.getElementById('floatBasketTotal');
    
    if (totalItems > 0) {
        floatingBasket.classList.remove('d-none');
        floatCount.textContent = `${totalItems} produit(s)`;
        floatTotal.textContent = totalPrice.toFixed(2);
    } else {
        floatingBasket.classList.add('d-none');
    }

    // Update offcanvas basket
    const basketItemsList = document.getElementById('basketItemsList');
    const offcanvasTotal = document.getElementById('offcanvasTotal');
    
    if (items.length > 0) {
        let html = '<div class="list-group">';
        items.forEach(item => {
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small class="text-muted">${item.quantity} × €${item.price.toFixed(2)}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">€${item.total.toFixed(2)}</span>
                </div>
            `;
        });
        html += '</div>';
        basketItemsList.innerHTML = html;
    } else {
        basketItemsList.innerHTML = '<p class="text-muted">Votre panier est vide.</p>';
    }
    
    offcanvasTotal.textContent = totalPrice.toFixed(2);
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

    // Charger les saisons disponibles
    loadSeasons();

    const form = document.getElementById('clientOrderForm');
    const statusMessage = document.getElementById('statusMessage');

    // Générer dynamiquement les cartes de produits
    const productGrid = document.getElementById('productGrid');
    if (productGrid) {
        const productCategories = [
            { label: '🥖 Pain Blanc', products: ['blanc_400g', 'blanc_800g', 'blanc_1kg'] },
            { label: '🌾 Pain Complet', products: ['complet_400g', 'complet_800g', 'complet_1kg'] },
            { label: '🌻 Pain aux Céréales', products: ['cereale_400g', 'cereale_800g', 'cereale_1kg'] },
            { label: '🌿 Pain d\'Épeautre', products: ['epeautre_400g', 'epeautre_800g', 'epeautre_1kg'] },
            { label: '🥐 Pain au Sarrazin', products: ['sarrazin'] }
        ];

        productCategories.forEach(category => {
            category.products.forEach(productId => {
                const name = PRODUCT_NAMES[productId];
                const price = PRICES[productId];
                
                const colDiv = document.createElement('div');
                colDiv.className = 'col';
                colDiv.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h6 class="card-title fw-bold text-primary mb-2">${name}</h6>
                            <p class="card-text text-success fw-semibold fs-5 mb-3">€ ${price.toFixed(2)}</p>
                            <div class="d-flex align-items-center justify-content-between">
                                <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" onclick="changeQuantity('${productId}', -1)" style="width:36px;height:36px;padding:0;">−</button>
                                <input type="number" id="${productId}" class="form-control form-control-sm text-center mx-2" value="0" min="0" style="max-width:70px;" oninput="updateTotal()" />
                                <button type="button" class="btn btn-sm btn-outline-success rounded-circle" onclick="changeQuantity('${productId}', 1)" style="width:36px;height:36px;padding:0;">+</button>
                            </div>
                        </div>
                    </div>
                `;
                productGrid.appendChild(colDiv);
            });
        });
    }

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
            showToast('Panier vide', 'Veuillez sélectionner au moins un produit.', 'warning');
            return;
        }

        // 2. Création de l'objet de commande pour l'API
        const selectedSeasonId = document.getElementById('seasonSelect').value;
        const selectedSeason = availableSeasons.find(s => s.id === selectedSeasonId);

        if (!selectedSeason) {
            showToast('Saison requise', 'Veuillez sélectionner une saison de commande.', 'warning');
            return;
        }

        const orderData = {
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            seasonId: selectedSeason.id,
            seasonName: selectedSeason.name,
            date: selectedSeason.endDate, // Utiliser la date de fin de saison comme date de livraison
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
                showToast('✅ Succès', `Commande enregistrée ! ID: ${result.orderId}`, 'success');
                form.reset();
                updateTotal();
                // Scroll to top to see confirmation
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                if (response.status >= 500) {
                    showToast('❌ Erreur serveur', 'Réessayez plus tard.', 'error');
                } else {
                    showToast('❌ Erreur', result && result.message ? result.message : 'Erreur inconnue', 'error');
                }
            }

        } catch (error) {
            console.error('Erreur de connexion à l\'API:', error);
            showToast('❌ Erreur réseau', 'Veuillez réessayer.', 'error');
        }
    });
});
