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


let CLIENT_PRODUCTS = [];
let CLIENT_PRODUCTS_FINGERPRINT = '';
let PRODUCTS_POLL_HANDLE = null;

function computeProductsFingerprint(products) {
    try {
        const minimal = (products||[]).map(p => ({
            id: String(p.id||''),
            name: String(p.name||''),
            category: String(p.category||''),
            sortOrder: Number(p.sortOrder||0),
            active: p.active !== false,
            price: Number(p.price||0),
            unitWeight: Number(p.unitWeight||0),
        })).sort((a,b)=> a.id.localeCompare(b.id));
        return JSON.stringify(minimal);
    } catch(e) { return ''; }
}

// Variables globales pour les saisons
let availableSeasons = [];
let orderingEnabled = false;

// Fonction pour charger les saisons disponibles
async function loadSeasons() {
    try {
        const response = await fetch('/api/seasons');
        const result = await response.json();

        if (response.ok && result.seasons) {
            availableSeasons = result.seasons;
            populateSeasonSelect();
            if (!availableSeasons || availableSeasons.length === 0) {
                orderingEnabled = false;
                setOrderingAvailability(false, 'Aucune livraison est prévue pour l\'instant. Restez connecté pour plus d\'informations.');
                const productGrid = document.getElementById('productGrid');
                if (productGrid) {
                    productGrid.innerHTML = '<div class="alert alert-warning text-center">Aucune livraison est prévue pour l\'instant. Restez connecté pour plus d\'informations.</div>';
                }
            } else {
                orderingEnabled = true;
                setOrderingAvailability(true);
            }
        } else {
            console.error('Erreur chargement saisons:', result.message);
            showToast('Erreur', 'Impossible de charger les saisons disponibles.', 'error');
            orderingEnabled = false;
            setOrderingAvailability(false, 'Aucune livraison est prévue pour l\'instant (erreur de chargement des saisons).');
        }
    } catch (error) {
        console.error('Erreur réseau saisons:', error);
        showToast('Erreur réseau', 'Impossible de charger les saisons.', 'error');
        orderingEnabled = false;
        setOrderingAvailability(false, 'Aucune livraison est prévue pour l\'instant (erreur réseau).');
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

// Activer/Désactiver la possibilité de commander selon disponibilité des saisons
function setOrderingAvailability(enabled, message) {
    const form = document.getElementById('clientOrderForm');
    const submitButtons = form ? form.querySelectorAll('.submit-buttons .submit-btn, button[type="submit"]') : [];
    const infoBanner = document.getElementById('basket-info-message');
    if (!enabled) {
        submitButtons.forEach(btn => { btn.disabled = true; btn.classList.add('disabled'); });
        if (infoBanner) {
            infoBanner.classList.remove('alert-info');
            infoBanner.classList.add('alert-warning');
            infoBanner.innerHTML = message || 'Commande momentanément indisponible. Veuillez réessayer plus tard.';
        }
        try { showMessageModal('Indisponible', message || 'Commande momentanément indisponible. Veuillez réessayer plus tard.', 'warning'); } catch(e){}
    } else {
        submitButtons.forEach(btn => { btn.disabled = false; btn.classList.remove('disabled'); });
        if (infoBanner) {
            infoBanner.classList.remove('alert-warning');
            infoBanner.classList.add('alert-info');
            infoBanner.innerHTML = 'Aucun produit dans votre panier.';
        }
    }
}

function renderClientProducts(products){
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;
    const activeProducts = (products || []).filter(p => p.active !== false);
    productGrid.innerHTML = '';

    function slugify(s){
        return String(s || 'autres').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
    }


    // Group by category and render collapsible sections
    const byCategory = new Map();
    activeProducts.forEach(p => {
        const cat = (p.category || 'Autres').trim() || 'Autres';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(p);
    });

    if (activeProducts.length === 0 || byCategory.size === 0) {
        productGrid.innerHTML = '<div class="alert alert-warning text-center">Momentanément aucun produit est disponible.</div>';
        return;
    }

    Array.from(byCategory.entries()).sort((a,b)=> String(a[0]).localeCompare(String(b[0]))).forEach(([cat, list]) => {
        // sort inside category by sortOrder then name
        list.sort((a,b)=>{
            const sa = (typeof a.sortOrder==='number')?a.sortOrder:0;
            const sb = (typeof b.sortOrder==='number')?b.sortOrder:0;
            if (sa !== sb) return sa - sb;
            return String(a.name||'').localeCompare(String(b.name||''));
        });
        const collapseId = `cat_${slugify(cat)}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'col-12';
        wrapper.innerHTML = `
            <div class="product-section">
                <div class="category-header d-flex justify-content-between align-items-center mb-2">
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary rounded-circle shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" data-role="toggle-arrow" style="width:36px;height:36px;line-height:1;">▼</button>
                        <h5 class="mb-0 category-toggle fw-semibold" role="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" style="cursor:pointer;">${cat}</h5>
                    </div>
                </div>
                <div id="${collapseId}" class="collapse">
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3"></div>
                </div>
            </div>`;
        const row = wrapper.querySelector('.row');
        list.forEach(p => {
            const id = `prod_${p.id}`;
            const colDiv = document.createElement('div');
            colDiv.className = 'col';
            colDiv.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-title fw-bold text-primary mb-2">${p.name}</h6>
                            <p class="card-text text-success fw-semibold fs-6 mb-1">€ ${Number(p.price).toFixed(2)}</p>
                        <p class="text-muted small mb-3">${Number(p.unitWeight).toFixed(3)} kg / unité</p>
                        <div class="d-flex align-items-center justify-content-between">
                            <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" onclick="changeQuantity('${id}', -1)" style="width:36px;height:36px;padding:0;">−</button>
                            <input type="number" id="${id}" data-name="${p.name}" data-price="${p.price}" data-unitweight="${p.unitWeight}" class="form-control form-control-sm text-center mx-2" value="0" min="0" style="max-width:70px;" oninput="updateTotal()" />
                            <button type="button" class="btn btn-sm btn-outline-success rounded-circle" onclick="changeQuantity('${id}', 1)" style="width:36px;height:36px;padding:0;">+</button>
                        </div>
                    </div>
                </div>`;
            row.appendChild(colDiv);
        });
        // Update arrow on collapse show/hide
        const collapseEl = wrapper.querySelector('#'+collapseId);
        const toggleBtn = wrapper.querySelector('button[data-role="toggle-arrow"]');
        const titleToggle = wrapper.querySelector('.category-toggle');
        if (collapseEl && toggleBtn) {
            collapseEl.addEventListener('show.bs.collapse', ()=>{ toggleBtn.textContent = '▲'; toggleBtn.setAttribute('aria-expanded','true'); if (titleToggle) titleToggle.setAttribute('aria-expanded','true'); });
            collapseEl.addEventListener('hide.bs.collapse', ()=>{ toggleBtn.textContent = '▼'; toggleBtn.setAttribute('aria-expanded','false'); if (titleToggle) titleToggle.setAttribute('aria-expanded','false'); });
        }
        // Fallback JS toggle (in case data attributes fail) for title click
        if (titleToggle && collapseEl) {
            titleToggle.addEventListener('click', (e)=>{
                e.preventDefault();
                const isShown = collapseEl.classList.contains('show');
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseEl);
                if (isShown) { bsCollapse.hide(); } else { bsCollapse.show(); }
            });
        }
        productGrid.appendChild(wrapper);
    });
}

async function loadClientProducts(){
    const productGrid = document.getElementById('productGrid');
    if (productGrid) {
        productGrid.innerHTML = '<div class="d-flex justify-content-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement…</span></div></div>';
    }
    try{
        const r = await fetch('/api/products');
        const j = await r.json();
        if (j.ok) {
            CLIENT_PRODUCTS = j.products || [];
            CLIENT_PRODUCTS_FINGERPRINT = computeProductsFingerprint(CLIENT_PRODUCTS);
            renderClientProducts(CLIENT_PRODUCTS);
            // restaurer les quantités si présentes en stockage temporaire
            restoreQuantitiesFromCache();
            updateTotal();
            ensureProductsAutoRefresh();
        }
    }catch(e){ console.error('Produits client', e); }
}

// Sauvegarder/restaurer quantités lors d'un rafraîchissement
function captureCurrentQuantities(){
    const map = {};
    document.querySelectorAll('#productGrid input[type="number"]').forEach(input => {
        const id = input.id;
        map[id] = parseInt(input.value) || 0;
    });
    try { sessionStorage.setItem('quantitiesCache', JSON.stringify(map)); } catch(e){}
}
function restoreQuantitiesFromCache(){
    let map = null;
    try { map = JSON.parse(sessionStorage.getItem('quantitiesCache')||'null'); } catch(e) { map = null; }
    if (!map) return;
    Object.keys(map).forEach(id => {
        const el = document.getElementById(id);
        if (el && el.type === 'number') { el.value = String(map[id]||0); }
    });
}

function ensureProductsAutoRefresh(){
    if (PRODUCTS_POLL_HANDLE) return;
    PRODUCTS_POLL_HANDLE = setInterval(async () => {
        if (!orderingEnabled) return;
        try{
            const r = await fetch('/api/products', { cache: 'no-cache' });
            const j = await r.json();
            if (!j.ok) return;
            const newProducts = j.products || [];
            const fp = computeProductsFingerprint(newProducts);
            if (fp !== CLIENT_PRODUCTS_FINGERPRINT) {
                // Changement détecté: re-rendre tout en préservant les quantités
                captureCurrentQuantities();
                CLIENT_PRODUCTS = newProducts;
                CLIENT_PRODUCTS_FINGERPRINT = fp;
                renderClientProducts(CLIENT_PRODUCTS);
                restoreQuantitiesFromCache();
                updateTotal();
            }
        }catch(e){ /* noop */ }
    }, 10000); // 10s
}

// Toast notification function (fixed)
function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toastEl.querySelector('.toast-header');
    toastTitle.textContent = title;
    toastBody.textContent = message;
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white');
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

// Changer la quantité depuis les boutons +/-
function changeQuantity(id, delta) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.value) || 0;
    const next = Math.max(0, current + delta);
    el.value = String(next);
    updateTotal();
}

// Recalculer le panier (total, bar flottante, offcanvas)
function updateTotal() {
    const inputs = document.querySelectorAll('#productGrid input[type="number"]');
    const items = [];
    let totalItems = 0;
    let totalPrice = 0;
    inputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            const name = input.getAttribute('data-name');
            const price = Number(input.getAttribute('data-price')) || 0;
            const line = price * qty;
            totalItems += qty;
            totalPrice += line;
            items.push({ name, quantity: qty, price, total: line, inputId: input.id });
        }
    });
    const totalEl = document.getElementById('total-price');
    if (totalEl) totalEl.textContent = totalPrice.toFixed(2);

    // Message panier
    const basketInfo = document.getElementById('basket-info-message');
    if (basketInfo) {
        if (totalItems === 0) {
            basketInfo.classList.remove('alert-warning');
            basketInfo.classList.add('alert-info');
            basketInfo.textContent = 'Aucun produit dans votre panier.';
        } else {
            basketInfo.classList.remove('alert-info');
            basketInfo.classList.add('alert-warning');
            basketInfo.textContent = `${totalItems} article(s) dans votre panier.`;
        }
    }

    // Bar flottante
    const floatingBasket = document.getElementById('floatingBasket');
    const floatCount = document.getElementById('floatBasketCount');
    const floatTotal = document.getElementById('floatBasketTotal');
    if (floatingBasket && floatCount && floatTotal) {
        if (totalItems > 0) {
            floatingBasket.classList.remove('d-none');
            floatCount.textContent = `${totalItems} produit(s)`;
            floatTotal.textContent = totalPrice.toFixed(2);
        } else {
            floatingBasket.classList.add('d-none');
        }
    }

    // Offcanvas panier
    const basketItemsList = document.getElementById('basketItemsList');
    const offcanvasTotal = document.getElementById('offcanvasTotal');
    if (basketItemsList && offcanvasTotal) {
        if (items.length > 0) {
            const canClear = items.length > 0;
            let html = `<div class="d-flex justify-content-between align-items-center mb-2">\n                <strong>Mon panier</strong>\n                <button type="button" class="btn btn-sm btn-outline-danger ${canClear? '':'disabled'}" ${canClear? 'onclick="clearBasket()"':''}>Vider le panier</button>\n            </div>`;
            html += '<div class="list-group">';
            items.forEach(item => {
                html += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${item.name}</strong><br>
                                <small class="text-muted">€${item.price.toFixed(2)} / unité</small>
                            </div>
                            <span class="badge bg-primary rounded-pill">€${item.total.toFixed(2)}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-end gap-2 mt-2">
                            <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" onclick="basketChangeQuantityById('${item.inputId}', -1)" style="width:32px;height:32px;padding:0;">−</button>
                            <input type="number" class="form-control form-control-sm text-center" value="${item.quantity}" min="0" style="width:70px;" oninput="basketSetQuantityById('${item.inputId}', this.value)" />
                            <button type="button" class="btn btn-sm btn-outline-success rounded-circle" onclick="basketChangeQuantityById('${item.inputId}', 1)" style="width:32px;height:32px;padding:0;">+</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="basketRemoveItemById('${item.inputId}')">Supprimer</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            basketItemsList.innerHTML = html;
        } else {
            basketItemsList.innerHTML = '<p class="text-muted">Votre panier est vide.</p>';
        }
        offcanvasTotal.textContent = totalPrice.toFixed(2);
    }
}

// Trouver l'input produit par id
function getProductInputById(id){
    return document.getElementById(id);
}

// Changer la quantité depuis le panier (offcanvas)
function basketChangeQuantityById(id, delta){
    const input = getProductInputById(id);
    if (!input) return;
    const current = parseInt(input.value) || 0;
    const next = Math.max(0, current + delta);
    input.value = String(next);
    updateTotal();
}

// Définir quantité depuis un champ de saisie du panier
function basketSetQuantityById(id, value){
    const qty = parseInt(value);
    if (Number.isNaN(qty) || qty < 0) return;
    const input = getProductInputById(id);
    if (!input) return;
    input.value = String(qty);
    updateTotal();
}

// Supprimer un élément ajouté (mettre quantité à 0)
function basketRemoveItemById(id){
    const input = getProductInputById(id);
    if (!input) return;
    input.value = '0';
    updateTotal();
}

// Vider le panier (toutes quantités à 0)
function clearBasket(){
    const hasAny = Array.from(document.querySelectorAll('#productGrid input[type="number"]')).some(input => (parseInt(input.value)||0) > 0);
    if (!hasAny) return;
    const okClear = await (window.showConfirmModal ? window.showConfirmModal('Vider le panier ? Toutes les quantités seront remises à zéro.') : Promise.resolve(confirm('Vider le panier ? Toutes les quantités seront remises à zéro.')));
    if (!okClear) return;
    document.querySelectorAll('#productGrid input[type="number"]').forEach(input => { input.value = '0'; });
    updateTotal();
}

document.addEventListener('DOMContentLoaded', () => {
    showPageLoader('Chargement des produits…');
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
    loadSeasons().finally(() => {
        try { hidePageLoader(); } catch(e){}
        // Ne charger les produits que si une saison est disponible
        if (orderingEnabled) {
            loadClientProducts();
        }
    });

    const form = document.getElementById('clientOrderForm');
    const statusMessage = document.getElementById('statusMessage');

    // Générer dynamiquement les cartes de produits (déplacé après vérification saisons)

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
        const submitBtn = form.querySelector('button[type="submit"]');
        
        statusMessage.textContent = '';
        statusMessage.className = 'status-message hidden';

        // 1. Collecte des articles commandés
        const items = [];
        let hasProducts = false;

        const NAME_WEIGHTS = window.NAME_WEIGHTS || {};
        function normalizeKey(s){ return String(s||'').trim().toLowerCase(); }
        function resolveMap(map, key){
            const nk = normalizeKey(key);
            if (nk in map) return map[nk];
            for (const k of Object.keys(map)) { if (normalizeKey(k) === nk) return map[k]; }
            return undefined;
        }
        document.querySelectorAll('#productGrid input[type="number"]').forEach(input => {
            const quantity = parseInt(input.value) || 0;
            if (quantity > 0) {
                const name = input.getAttribute('data-name');
                const price = Number(input.getAttribute('data-price')) || 0;
                let unitWeight = Number(input.getAttribute('data-unitweight')) || 0;
                if (!unitWeight) unitWeight = Number(resolveMap(NAME_WEIGHTS, name) || 0);
                items.push({ name, quantity, price, unitWeight });
                hasProducts = true;
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
            items: items,
            userId: currentUser.userId || currentUser.id || null,
            // Pas d'adresse de livraison/retrait sur la page de commande
        };

        // 3. Envoi à l'API Vercel
        try {
            if (submitBtn) submitBtn.classList.add('btn-loading');
            disableForm(form);
            showPageLoader('Enregistrement de la commande…');
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
        } finally {
            if (submitBtn) submitBtn.classList.remove('btn-loading');
            enableForm(form);
            hidePageLoader();
        }
    });

    // Soumission directe depuis le panier offcanvas
    const offcanvasSubmitBtn = document.getElementById('offcanvasSubmitBtn');
    function offcanvasCanSubmit(){
        const hasProducts = Array.from(document.querySelectorAll('#productGrid input[type="number"]')).some(inp => (parseInt(inp.value)||0) > 0);
        const seasonOk = !!document.getElementById('seasonSelect')?.value;
        return hasProducts && seasonOk && orderingEnabled;
    }
    function updateOffcanvasSubmitState(){
        if (!offcanvasSubmitBtn) return;
        offcanvasSubmitBtn.disabled = !offcanvasCanSubmit();
    }
    if (offcanvasSubmitBtn){
        offcanvasSubmitBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            if (!offcanvasCanSubmit()) { showToast('Incomplet', 'Sélectionnez produits et saison.', 'warning'); return; }
            form.requestSubmit();
        });
        // Mettre à jour l'état quand panier ou saison change
        document.getElementById('seasonSelect')?.addEventListener('change', updateOffcanvasSubmitState);
        // Sur chaque input quantité
        document.addEventListener('input', (ev)=>{
            if (ev.target && ev.target.matches('#productGrid input[type="number"]')) updateOffcanvasSubmitState();
        });
        updateOffcanvasSubmitState();
    }
});
