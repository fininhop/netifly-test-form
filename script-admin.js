// script-admin.js - Interface d'administration simple (token-based)

// Toast notification function
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

document.addEventListener('DOMContentLoaded', () => {
    const adminLogin = document.getElementById('adminLogin');
    const adminArea = document.getElementById('adminArea');
    const adminForm = document.getElementById('adminLoginForm');
    const tokenInput = document.getElementById('adminTokenInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const ordersContainer = document.getElementById('ordersContainer');
    const adminMessage = document.getElementById('adminMessage');
    const logoutAdmin = document.getElementById('logoutAdmin');
    const sortSelect = document.getElementById('sortSelect');
    // Repositionner la section Produits après Saisons
    try {
        const prodItem = document.getElementById('headingProducts')?.closest('.accordion-item');
        const seasonsItem = document.getElementById('headingSeasons')?.closest('.accordion-item');
        if (prodItem && seasonsItem && seasonsItem.parentNode) {
            seasonsItem.after(prodItem);
        }
    } catch(e) { /* noop */ }
    
        // Produits: chargement et CRUD
        let currentProducts = [];
        async function loadProducts() {
            const resp = await fetch('/api/products');
            const data = await resp.json();
            if (!data.ok) return;
            currentProducts = data.products || [];
            const grid = document.getElementById('productsGrid');
            if (!grid) return;
            grid.innerHTML = '';
            currentProducts.forEach(p => {
                const col = document.createElement('div');
                col.className = 'col-12 col-md-6';
                const card = document.createElement('div');
                card.className = 'card h-100 shadow-sm';
                const body = document.createElement('div');
                body.className = 'card-body';
                const title = document.createElement('h6');
                title.className = 'card-title fw-bold text-primary mb-2';
                title.textContent = String(p.name || '');
                const priceEl = document.createElement('p');
                priceEl.className = 'card-text text-success fw-semibold fs-6 mb-1';
                priceEl.textContent = '€ ' + Number(p.price).toFixed(2);
                const weightEl = document.createElement('p');
                weightEl.className = 'text-muted small mb-2';
                weightEl.textContent = Number(p.unitWeight).toFixed(3) + ' kg / unité';
                const activeBadge = document.createElement('span');
                activeBadge.className = 'badge ' + (p.active ? 'bg-success' : 'bg-secondary');
                activeBadge.textContent = p.active ? 'Actif' : 'Inactif';
                activeBadge.style.marginRight = '8px';
                const actions = document.createElement('div');
                actions.className = 'd-flex justify-content-end gap-2';
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn btn-sm btn-outline-primary';
                btnEdit.setAttribute('data-action', 'edit');
                btnEdit.setAttribute('data-id', String(p.id));
                btnEdit.textContent = 'Éditer';
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn btn-sm btn-outline-danger';
                btnDelete.setAttribute('data-action', 'delete');
                btnDelete.setAttribute('data-id', String(p.id));
                btnDelete.textContent = 'Supprimer';
                actions.appendChild(btnEdit); actions.appendChild(btnDelete);
                body.appendChild(title);
                body.appendChild(priceEl);
                body.appendChild(weightEl);
                body.appendChild(activeBadge);
                body.appendChild(actions);
                card.appendChild(body);
                col.appendChild(card);
                grid.appendChild(col);
            });

            grid.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const action = e.currentTarget.getAttribute('data-action');
                    const prod = currentProducts.find(x => x.id === id);
                    const token = localStorage.getItem('adminToken');
                    if (action === 'delete') {
                        if (!confirm(`Supprimer le produit "${prod?.name}" ?`)) return;
                        const r = await fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
                        const j = await r.json();
                        if (j.ok) {
                            showToast('Produit supprimé', 'Succès');
                            loadProducts();
                        } else showToast(j.error || 'Erreur', 'Erreur');
                    }
                    if (action === 'edit') {
                        try { console.debug('Produits: open edit modal for', prod); } catch(e){}
                        openProductModal(prod);
                    }
                });
            });
        }

        function wireProductCreateForm() {
            const form = document.getElementById('createProductForm');
            if (!form) return;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('prodName').value.trim();
                const price = Number(document.getElementById('prodPrice').value);
                const unitWeight = Number(document.getElementById('prodUnitWeight').value);
                if (!name || Number.isNaN(price) || Number.isNaN(unitWeight)) {
                    return showMessageModal('Champs requis', 'Veuillez renseigner correctement les champs.', 'warning');
                }
                const token = localStorage.getItem('adminToken');
                const resp = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ name, price, unitWeight, active: true }) });
                const j = await resp.json();
                if (j.ok) {
                    form.reset();
                    showToast('Produit ajouté', 'Succès');
                    loadProducts();
                } else showToast(j.error || 'Erreur', 'Erreur');
            });
        }

        // Modal édition produit
        const productModalEl = document.getElementById('productModal');
        const productIdInput = document.getElementById('productId');
        const productNameInput = document.getElementById('productName');
        const productPriceInput = document.getElementById('productPrice');
        const productUnitWeightInput = document.getElementById('productUnitWeight');
        const productActiveInput = document.getElementById('productActive');
        const saveProductBtn = document.getElementById('saveProductBtn');
        let productModal = null;
        if (productModalEl && window.bootstrap) {
            productModal = new bootstrap.Modal(productModalEl);
        }

        function openProductModal(prod) {
            if (!productModal && window.bootstrap && productModalEl) {
                productModal = new bootstrap.Modal(productModalEl);
            }
            if (!productModal) { showToast('Erreur', 'Le module modal n\'est pas chargé', 'error'); return; }
            productIdInput.value = prod && prod.id ? String(prod.id) : '';
            productNameInput.value = prod && prod.name ? String(prod.name) : '';
            productPriceInput.value = prod && typeof prod.price === 'number' ? String(prod.price) : '';
            productUnitWeightInput.value = prod && typeof prod.unitWeight === 'number' ? String(prod.unitWeight) : '';
            productActiveInput.checked = !!(prod && prod.active !== false);
            productModal.show();
        }

        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', async () => {
                const id = productIdInput.value.trim();
                const name = productNameInput.value.trim();
                const price = Number(productPriceInput.value);
                const unitWeight = Number(productUnitWeightInput.value);
                const active = !!productActiveInput.checked;
                if (!name || Number.isNaN(price) || Number.isNaN(unitWeight)) {
                    showToast('Champs requis', 'Vérifiez nom, prix et poids', 'warning');
                    return;
                }
                const token = localStorage.getItem('adminToken');
                try {
                    const resp = await fetch('/api/products?id=' + encodeURIComponent(id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ name, price, unitWeight, active })
                    });
                    const j = await resp.json();
                    if (resp.ok && j && j.ok) {
                        showToast('Succès', 'Produit mis à jour', 'success');
                        if (productModal) productModal.hide();
                        loadProducts();
                    } else {
                        showToast('Erreur', (j && j.error) ? j.error : 'Échec de mise à jour', 'error');
                    }
                } catch (err) {
                    console.error('Erreur update produit:', err);
                    showToast('Erreur réseau', 'Réessayez', 'error');
                }
            });
        }

        wireProductCreateForm();
        loadProducts();

    // Éléments pour la gestion des saisons
    const seasonsContainer = document.getElementById('seasonsContainer');
    const seasonFilter = document.getElementById('seasonFilter');
    const newSeasonBtn = document.getElementById('newSeasonBtn');
    const seasonModalEl = document.getElementById('seasonModal');
    const seasonModal = seasonModalEl ? new bootstrap.Modal(seasonModalEl) : null;
    const saveSeasonBtn = document.getElementById('saveSeasonBtn');
    const seasonForm = document.getElementById('seasonForm');
    const seasonIdInput = document.getElementById('seasonId');
    const seasonNameInput = document.getElementById('seasonName');
    const seasonStartInput = document.getElementById('seasonStart');
    const seasonEndInput = document.getElementById('seasonEnd');
    const seasonDescInput = document.getElementById('seasonDescription');

    // Fonction utilitaire: ouvrir le modal (création ou édition de saison)
    function openSeasonModal(season) {
        if (!seasonModal) return;
        if (season) {
            seasonIdInput.value = season.id || '';
            seasonNameInput.value = season.name || '';
            seasonStartInput.value = season.startDate || '';
            seasonEndInput.value = season.endDate || '';
            seasonDescInput.value = season.description || '';
            if (saveSeasonBtn) saveSeasonBtn.textContent = 'Mettre à jour';
        } else {
            seasonIdInput.value = '';
            seasonNameInput.value = '';
            seasonStartInput.value = '';
            seasonEndInput.value = '';
            seasonDescInput.value = '';
            if (saveSeasonBtn) saveSeasonBtn.textContent = 'Créer';
        }
        seasonModal.show();
    }

    // Utilisateurs (Administrer utilisateurs)
    const adminUsersList = document.getElementById('adminUsersList');
    const adminUserSearchQuery = document.getElementById('adminUserSearchQuery');
    const adminUsersReload = document.getElementById('adminUsersReload');
    let allUsers = [];

    function showMessage(text, type='') {
        adminMessage.innerHTML = text ? `<div class="text-${type}">${text}</div>` : '';
    }

    // Gestionnaire de tri
    sortSelect.addEventListener('change', () => {
        currentSortBy = sortSelect.value;
        if (currentOrders.length > 0) {
            applyOrdersView();
        }
    });

    // Utiliser le mapping global centralisé défini dans config.js
    const NAME_PRICES = window.NAME_PRICES || {};
    const NAME_WEIGHTS = window.NAME_WEIGHTS || {};
    function normalizeKey(s){ return String(s||'').trim().toLowerCase(); }
    function resolveMap(map, key){
        const nk = normalizeKey(key);
        if (nk in map) return map[nk];
        for (const k of Object.keys(map)) { if (normalizeKey(k) === nk) return map[k]; }
        return undefined;
    }

    function computeOrderTotal(order) {
        const items = order.items || [];
        return items.reduce((sum, it) => {
            const priceFromMap = resolveMap(window.NAME_PRICES || {}, it.name);
            const unit = (typeof it.price === 'number') ? it.price : (priceFromMap !== undefined ? priceFromMap : 0);
            const qty = Number(it.quantity) || 0;
            return sum + unit * qty;
        }, 0);
    }

    const seasonStatsEl = document.getElementById('seasonStats');
    const seasonOrderCountEl = document.getElementById('seasonOrderCount');
    const seasonTotalPriceEl = document.getElementById('seasonTotalPrice');
    const seasonAveragePriceEl = document.getElementById('seasonAveragePrice');
    const allSeasonsStatsEl = document.getElementById('allSeasonsStats');
    const allSeasonsStatsBodyTbody = (function(){
        const el = document.querySelector('#allSeasonsStatsBody tbody');
        return el;
    })();
    const allSeasonsTotalCountEl = document.getElementById('allSeasonsTotalCount');
    const allSeasonsTotalPriceEl = document.getElementById('allSeasonsTotalPrice');
    const allSeasonsAvgPriceEl = document.getElementById('allSeasonsAvgPrice');

    function updateSeasonStats(ordersForView) {
        if (!seasonStatsEl) return;
        const hasSeason = currentSeasonFilter && currentSeasonFilter !== 'all';
        if (!hasSeason) {
            seasonStatsEl.style.display = 'none';
            return;
        }
        const count = ordersForView.length;
        const total = ordersForView.reduce((s, o) => s + computeOrderTotal(o), 0);
        const avg = count > 0 ? total / count : 0;
        seasonOrderCountEl.textContent = String(count);
        seasonTotalPriceEl.textContent = `€${total.toFixed(2)}`;
        seasonAveragePriceEl.textContent = `€${avg.toFixed(2)}`;
        seasonStatsEl.style.display = 'block';
    }

    function applyOrdersView() {
        let list = [...currentOrders];
        if (currentSeasonFilter && currentSeasonFilter !== 'all') {
            list = list.filter(o => (o.seasonId || '') === currentSeasonFilter);
        }
        renderOrders(list, currentSortBy);
        updateSeasonStats(list);
        updateAllSeasonsStats(currentOrders);
    }

    function updateAllSeasonsStats(orders) {
        if (!allSeasonsStatsEl || !allSeasonsStatsBodyTbody) return;
        const showAll = currentSeasonFilter === 'all';
        allSeasonsStatsEl.style.display = showAll ? 'block' : 'none';
        if (!showAll) return;
        const bySeason = new Map();
        orders.forEach(o => {
            const key = o.seasonName || o.seasonId || '—';
            const total = computeOrderTotal(o);
            const entry = bySeason.get(key) || { count: 0, sum: 0 };
            entry.count += 1;
            entry.sum += total;
            bySeason.set(key, entry);
        });
        const rows = Array.from(bySeason.entries()).sort((a,b) => String(a[0]).localeCompare(String(b[0]))).map(([name, stats]) => {
            const avg = stats.count ? (stats.sum / stats.count) : 0;
            return `<tr><td>${name}</td><td>${stats.count}</td><td>€${stats.sum.toFixed(2)}</td><td>€${avg.toFixed(2)}</td></tr>`;
        }).join('');
        allSeasonsStatsBodyTbody.innerHTML = rows || '<tr><td colspan="4" class="text-muted">Aucune donnée</td></tr>';
        const totalCount = orders.length;
        const totalSum = orders.reduce((s,o)=> s + computeOrderTotal(o), 0);
        const totalAvg = totalCount ? (totalSum / totalCount) : 0;
        allSeasonsTotalCountEl.textContent = String(totalCount);
        allSeasonsTotalPriceEl.textContent = `€${totalSum.toFixed(2)}`;
        allSeasonsAvgPriceEl.textContent = `€${totalAvg.toFixed(2)}`;
    }

    function renderOrders(orders, sortBy = 'createdAt') {
        if (!orders || !orders.length) {
            ordersContainer.innerHTML = '<div class="alert alert-info text-center py-5"><h5>📭 Aucune commande trouvée</h5><p class="mb-0">Il n\'y a pas encore de commandes à afficher.</p></div>';
            return;
        }

        // Trier les commandes
        const sortedOrders = [...orders].sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'createdAt':
                    aVal = new Date(a.createdAt || 0);
                    bVal = new Date(b.createdAt || 0);
                    return bVal - aVal; // Plus récent en premier
                case 'date':
                    aVal = a.date || '';
                    bVal = b.date || '';
                    return aVal.localeCompare(bVal);
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    return aVal.localeCompare(bVal);
                // ancien case retiré
                case 'season':
                    aVal = (a.seasonName || a.seasonId || '').toLowerCase();
                    bVal = (b.seasonName || b.seasonId || '').toLowerCase();
                    return aVal.localeCompare(bVal);
                default:
                    return 0;
            }
        });

        // Générer les cartes
        let html = '';
        sortedOrders.forEach(o => {
            const items = (o.items || []).map(it => {
                const unit = (typeof it.price === 'number') ? it.price : (NAME_PRICES[it.name] || 0);
                const line = unit ? `€${(unit * (Number(it.quantity)||0)).toFixed(2)}` : '';
                return `<div class="item-row"><span>${it.quantity} × ${it.name}</span><span class="text-muted">${line}</span></div>`;
            }).join('');
            const orderTotal = computeOrderTotal(o);
            
            
            const dateCmd = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) : '—';
            
            const dateRetrait = o.date ? new Date(o.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
            }) : '—';

            html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="order-card" data-order-id="${o.id}" data-order-date="${o.date || ''}">
                        <div class="order-header">
                            <h6 class="order-title">👤 ${o.name} ${o.seasonName ? `<span class='badge bg-info ms-1'>${o.seasonName}</span>` : ''}</h6>
                            <p class="order-date">📅 ${dateCmd} &nbsp; <strong>Total: €${orderTotal.toFixed(2)}</strong></p>
                        </div>
                        <div class="order-body">
                            <div class="order-info">
                                <div class="info-item">
                                    <span class="info-label">📧 Contact</span>
                                    <span class="info-value">${o.email}<br><small class="text-muted">${o.phone}</small></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">📍 Retrait</span>
                                    <span class="info-value">${dateRetrait}</span>
                                </div>
                                
                            </div>
                            
                            <div class="items-section">
                                <div class="items-title">🛒 Articles commandés</div>
                                ${items}
                            </div>
                            
                            <div class="order-actions">
                                <button class="btn btn-sm btn-outline-secondary btn-edit">✏️ Éditer</button>
                                <button class="btn btn-sm btn-outline-danger btn-delete">🗑️ Supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersContainer.innerHTML = `<div class="row g-3">${html}</div>`;

        // Attacher écouteurs aux boutons
        ordersContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const clientName = card && card.querySelector('.order-title').textContent;
                if (!orderId) return;
                if (!confirm(`Confirmer la suppression de la commande de ${clientName} ?`)) return;
                const token = localStorage.getItem('adminToken');
                showPageLoader('Suppression…');
                try {
                    const resp = await fetch('/api/delete-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Commande supprimée', 'success');
                        card.remove();
                    } else {
                        showToast('❌ Erreur', 'Suppression échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur delete:', err);
                    showToast('❌ Erreur réseau', 'Impossible de supprimer la commande', 'error');
                } finally {
                    hidePageLoader();
                }
            });
        });

        // Modal-based edit
        const modalEl = document.getElementById('editModal');
        const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
        const editOrderId = document.getElementById('editOrderId');
        const editDate = document.getElementById('editDate');
        const saveEditBtn = document.getElementById('saveEditBtn');

        ordersContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const date = card && card.getAttribute('data-order-date');
                if (!orderId || !modal) return;
                editOrderId.value = orderId;
                editDate.value = (date || '');
                modal.show();
            });
        });

        if (saveEditBtn && modal) {
            saveEditBtn.onclick = async () => {
                const orderId = editOrderId.value;
                const updates = {};
                if (editDate.value) updates.date = editDate.value;
                
                if (!orderId || Object.keys(updates).length === 0) { modal.hide(); return; }
                const token = localStorage.getItem('adminToken');
                showPageLoader('Mise à jour…');
                try {
                    const resp = await fetch('/api/update-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId, updates })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Commande mise à jour', 'success');
                        modal.hide();
                        fetchAdminOrders(token);
                    } else {
                        showToast('❌ Erreur', 'Mise à jour échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur update:', err);
                    showToast('❌ Erreur réseau', 'Impossible de mettre à jour', 'error');
                } finally {
                    hidePageLoader();
                }
            };
        }
    }

    let currentOrders = [];
    let currentSortBy = 'createdAt';
    let currentSeasons = [];
    let currentSeasonFilter = 'all';
    const exportSeasonPdfBtn = document.getElementById('exportSeasonPdf');
    const exportSeasonCsvBtn = document.getElementById('exportSeasonCsv');

    // Fonctions de gestion des saisons
    async function fetchSeasons(token) {
        try {
            const response = await fetch('/api/seasons', { headers: { 'x-admin-token': token } });
            const result = await response.json();

            if (response.ok) {
                currentSeasons = result.seasons || [];
                renderSeasons(currentSeasons);
                updateSeasonFilter();
                return currentSeasons;
            } else {
                console.error('Erreur chargement saisons:', result.message);
                return [];
            }
        } catch (error) {
            console.error('Erreur réseau saisons:', error);
            return [];
        }
    }

    function renderSeasons(seasons) {
        if (!seasonsContainer) return;

        if (!seasons || seasons.length === 0) {
            seasonsContainer.innerHTML = '<div class="alert alert-info text-center py-3"><h6>📅 Aucune saison</h6><p class="mb-0">Créez votre première saison de commande.</p></div>';
            return;
        }

        let html = '';
        seasons.forEach(season => {
            const startDate = season.startDate ? new Date(season.startDate).toLocaleDateString('fr-FR') : '—';
            const endDate = season.endDate ? new Date(season.endDate).toLocaleDateString('fr-FR') : '—';
            const isActive = isSeasonActive(season);

            html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="season-card ${isActive ? 'active' : ''}" data-season-id="${season.id}">
                        <div class="season-header">
                            <h6 class="season-title">🌸 ${season.name}</h6>
                            <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div class="season-body">
                            <div class="season-dates">
                                <div class="date-item">
                                    <span class="date-label">Début:</span>
                                    <span class="date-value">${startDate}</span>
                                </div>
                                <div class="date-item">
                                    <span class="date-label">Fin:</span>
                                    <span class="date-value">${endDate}</span>
                                </div>
                            </div>
                            ${season.description ? `<div class="season-desc">${season.description}</div>` : ''}
                            <div class="season-actions">
                                <button class="btn btn-sm btn-outline-primary btn-edit-season">✏️ Éditer</button>
                                <button class="btn btn-sm btn-outline-danger btn-delete-season">🗑️ Supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        seasonsContainer.innerHTML = `<div class="row g-3">${html}</div>`;

        // Boutons Edit/Supprimer pour chaque saison
        seasonsContainer.querySelectorAll('.btn-edit-season').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.season-card');
                const id = card && card.getAttribute('data-season-id');
                if (!id) return;
                const s = currentSeasons.find(x => x.id === id);
                if (!s || !seasonModal) return;
                openSeasonModal(s);
            });
        });

        seasonsContainer.querySelectorAll('.btn-delete-season').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.season-card');
                const id = card && card.getAttribute('data-season-id');
                if (!id) return;
                if (!confirm('Supprimer cette saison ?')) return;
                const token = localStorage.getItem('adminToken');
                try {
                    const resp = await fetch(`/api/seasons?seasonId=${encodeURIComponent(id)}` , {
                        method: 'DELETE',
                        headers: { 'x-admin-token': token }
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Saison supprimée', 'success');
                        // Retirer visuellement ou recharger
                        fetchSeasons(token);
                    } else {
                        showToast('❌ Erreur', 'Suppression échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur delete saison:', err);
                    showToast('❌ Erreur réseau', 'Impossible de supprimer la saison', 'error');
                }
            });
        });
    }

    function isSeasonActive(season) {
        const now = new Date();
        const start = new Date(season.startDate);
        const end = new Date(season.endDate);
        return now >= start && now <= end;
    }

    function updateSeasonFilter() {
        if (!seasonFilter) return;

        let options = '<option value="all">Toutes les saisons</option>';
        currentSeasons.forEach(season => {
            const isActive = isSeasonActive(season);
            options += `<option value="${season.id}" ${isActive ? 'selected' : ''}>${season.name} ${isActive ? '(Active)' : ''}</option>`;
        });

        seasonFilter.innerHTML = options;
        // Mettre à jour le filtre actuel si une saison active est auto-sélectionnée
        const selected = seasonFilter.value || 'all';
        currentSeasonFilter = selected;
        applyOrdersView();
    }

    async function fetchAdminOrders(token) {
        showMessage('Chargement...', 'muted');
        try {
            const response = await fetch('/api/get-orders', { headers: { 'x-admin-token': token } });
            let result = null;
            try { result = await response.json(); } catch(e) { result = null; }

            if (!response.ok) {
                showMessage('Erreur: ' + (result && result.message ? result.message : response.statusText), 'danger');
                return;
            }

            currentOrders = result.orders || [];
            renderOrders(currentOrders, currentSortBy);
            showMessage('Chargé: ' + currentOrders.length + ' commandes', 'success');
        } catch (err) {
            console.error('Erreur admin fetch:', err);
            showMessage('Erreur réseau. Réessayez.', 'danger');
        }
    }

    // Si token existant en localStorage, tenter login automatique
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        fetchAdminOrders(storedToken);
        fetchSeasons(storedToken);
        fetchUsers();
    }

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = tokenInput.value.trim();
        if (!token) return;
        showPageLoader('Connexion administrateur…');
        disableForm(adminForm);
        localStorage.setItem('adminToken', token);
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        try {
            await Promise.all([fetchAdminOrders(token), fetchSeasons(token)]);
            await fetchUsers();
        } finally {
            enableForm(adminForm);
            hidePageLoader();
        }
    });

    refreshBtn.addEventListener('click', async () => {
        const t = localStorage.getItem('adminToken');
        if (!t) { showMessage('Token manquant', 'danger'); return; }
        showPageLoader('Actualisation des données…');
        try {
            await Promise.all([fetchAdminOrders(t), fetchSeasons(t)]);
            await fetchUsers();
        } finally {
            hidePageLoader();
        }
    });

    logoutAdmin.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        adminArea.classList.add('d-none');
        adminLogin.classList.remove('d-none');
        ordersContainer.innerHTML = '';
        showMessage('Déconnecté');
    });

    // Ouvrir le modal pour une nouvelle saison
    if (newSeasonBtn && seasonModal) {
        newSeasonBtn.addEventListener('click', () => {
            openSeasonModal(null);
        });
    }

    // Filtre par saison (afficher toutes ou une saison spécifique)
    if (seasonFilter) {
        seasonFilter.addEventListener('change', () => {
            currentSeasonFilter = seasonFilter.value || 'all';
            applyOrdersView();
        });
    }

    // Export PDF / CSV
    if (exportSeasonPdfBtn) {
        exportSeasonPdfBtn.addEventListener('click', () => {
            try { exportSeasonPdfMake(); }
            catch (e) { console.error('Erreur export PDF:', e); showToast('❌ Erreur', 'Export PDF impossible', 'error'); }
        });
    }
    if (exportSeasonCsvBtn) {
        exportSeasonCsvBtn.addEventListener('click', () => {
            try { exportSeasonCsv(); showToast('✅ Export CSV', 'Fichier téléchargé', 'success'); }
            catch (e) { console.error('Erreur export CSV:', e); showToast('❌ Erreur', 'Export CSV impossible', 'error'); }
        });
    }

    // Nettoyage associé à l'ancien champ supprimé

    // Sauvegarder (créer/mettre à jour) une saison
    if (saveSeasonBtn && seasonModal) {
        saveSeasonBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) { showToast('❌ Erreur', 'Token admin manquant', 'error'); return; }

            const payload = {
                name: (seasonNameInput.value || '').trim(),
                startDate: (seasonStartInput.value || '').trim(),
                endDate: (seasonEndInput.value || '').trim(),
                description: (seasonDescInput.value || '').trim()
            };

            if (!payload.name || !payload.startDate || !payload.endDate) {
                showToast('⚠️ Champs requis', 'Nom, début et fin sont requis', 'warning');
                return;
            }

            const id = (seasonIdInput.value || '').trim();
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/seasons?seasonId=${encodeURIComponent(id)}` : '/api/seasons';
            try {
                const resp = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                    body: JSON.stringify(payload)
                });
                const jr = await resp.json().catch(() => null);
                if (resp.ok) {
                    showToast('✅ Succès', id ? 'Saison mise à jour' : 'Saison créée', 'success');
                    seasonModal.hide();
                    fetchSeasons(token);
                } else {
                    showToast('❌ Erreur', (jr && jr.message) ? jr.message : 'Échec enregistrement saison', 'error');
                }
            } catch (err) {
                console.error('Erreur save saison:', err);
                showToast('❌ Erreur réseau', 'Impossible d’enregistrer la saison', 'error');
            }
        });
    }
    // Fonction d'export PDF (pdfmake) globale
    function exportSeasonPdfMake() {
        const list = currentSeasonFilter === 'all' ? currentOrders : currentOrders.filter(o => (o.seasonId || '') === currentSeasonFilter);
        const NAME_PRICES = window.NAME_PRICES || {};
        const NAME_WEIGHTS = window.NAME_WEIGHTS || {};
        const productsByName = {};
        try {
            (window.ADMIN_PRODUCTS || []).forEach(p => { productsByName[String(p.name||'').trim().toLowerCase()] = p; });
        } catch(e) {}
        const seasonName = (currentSeasons.find(s => s.id === currentSeasonFilter) || {}).name || (currentSeasonFilter === 'all' ? 'Toutes les saisons' : 'Saison');
        const sorted = [...list].sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')));
        let grandTotalPrice = 0, grandTotalWeight = 0;
        const sections = [];
        sorted.forEach(o => {
            let subTotalPrice = 0, subTotalWeight = 0;
            const body = [[
                { text: 'Article', bold: true },
                { text: 'Quantité', bold: true },
                { text: 'Prix Unitaire', bold: true },
                { text: 'Poids (kg)', bold: true },
                { text: 'Total (€)', bold: true },
                { text: 'Total Poids (kg)', bold: true }
            ]];
            (o.items || []).forEach(it => {
                const priceFromMap = resolveMap(NAME_PRICES, it.name);
                let unit = Number(priceFromMap !== undefined ? priceFromMap : (it.price || 0));
                if (!unit) {
                    const p = productsByName[String(it.name||'').trim().toLowerCase()];
                    unit = p ? Number(p.price)||0 : 0;
                }
                // Priorité au poids fourni par la commande, sinon mapping
                const weightFromItem = (typeof it.unitWeight === 'number') ? it.unitWeight : undefined;
                const weightFromMap = resolveMap(NAME_WEIGHTS, it.name);
                let wkg = Number(weightFromItem !== undefined ? weightFromItem : (weightFromMap || 0));
                if (!wkg) {
                    const p = productsByName[String(it.name||'').trim().toLowerCase()];
                    wkg = p ? Number(p.unitWeight)||0 : 0;
                }
                const qty = Number(it.quantity)||0;
                const linePrice = unit * qty;
                const lineWeight = wkg * qty;
                subTotalPrice += linePrice;
                subTotalWeight += lineWeight;
                body.push([
                    it.name || '',
                    String(qty),
                    unit ? `€${unit.toFixed(2)}` : '-',
                    wkg ? wkg.toFixed(3) : '-',
                    `€${linePrice.toFixed(2)}`,
                    lineWeight ? lineWeight.toFixed(3) : '0.000'
                ]);
            });
            grandTotalPrice += subTotalPrice;
            grandTotalWeight += subTotalWeight;
            sections.push({
                margin: [0, 10, 0, 10],
                stack: [
                    { text: `${o.name} • ${o.phone || ''} • ${o.email || ''}`, style: 'clientHeader' },
                    { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'], body } },
                    { text: `Sous-total prix: €${subTotalPrice.toFixed(2)} • Sous-total poids: ${subTotalWeight.toFixed(3)} kg`, style: 'subtotals' }
                ]
            });
        });
        const nowStr = new Date().toLocaleString('fr-FR');
        const docDefinition = {
            pageMargins: [40,60,40,40],
            header: { columns: [ { text: `Commandes - ${seasonName}`, style: 'headerLeft' }, { text: nowStr, alignment: 'right', style: 'headerRight' } ], margin:[40,20,40,0] },
            content: [
                { text: `Total montant: €${grandTotalPrice.toFixed(2)}`, style: 'totals' },
                { text: `Total poids: ${grandTotalWeight.toFixed(3)} kg`, style: 'totals' },
                { text: ' ', margin: [0, 4, 0, 8] },
                ...sections
            ],
            styles: {
                headerLeft: { fontSize: 14, bold: true },
                headerRight: { fontSize: 10, color: '#555' },
                totals: { fontSize: 13, bold: true, color: '#2d3748' },
                clientHeader: { fontSize: 11, bold: true, margin: [0, 0, 0, 6], color:'#2d3748' },
                subtotals: { fontSize: 10, italics: true, margin: [0, 6, 0, 0], color:'#333' }
            },
            defaultStyle: { fontSize: 9 },
            footer: function(currentPage, pageCount) {
                return { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', margin:[0,0,20,0], fontSize:8, color:'#666' };
            }
        };
        // Appliquer layout zebra sur chaque table
        docDefinition.content.forEach(block => {
            if (block.table) {
                block.layout = {
                    fillColor: function (rowIndex) {
                        return rowIndex === 0 ? '#e2e8f0' : (rowIndex % 2 === 0 ? '#f8fafc' : null);
                    },
                    hLineColor: () => '#cbd5e0',
                    vLineColor: () => '#cbd5e0'
                };
            }
            if (block.stack) {
                block.stack.forEach(inner => {
                    if (inner.table) {
                        inner.layout = {
                            fillColor: function (rowIndex) {
                                return rowIndex === 0 ? '#e2e8f0' : (rowIndex % 2 === 0 ? '#f8fafc' : null);
                            },
                            hLineColor: () => '#cbd5e0',
                            vLineColor: () => '#cbd5e0'
                        };
                    }
                });
            }
        });
        if (window.pdfMake && window.pdfMake.createPdf) window.pdfMake.createPdf(docDefinition).download('commandes.pdf');
        else showToast('❌ Erreur', 'pdfmake non chargé', 'error');
    }

    function exportSeasonCsv() {
        const list = currentSeasonFilter === 'all' ? currentOrders : currentOrders.filter(o => (o.seasonId || '') === currentSeasonFilter);
        const prices = window.NAME_PRICES || {};
        const weights = window.NAME_WEIGHTS || {};
        const rows = [];
        rows.push(['Client','Email','Téléphone','Saison','Article','Quantité','Prix Unitaire (€)','Poids Unitaire (kg)','Total Ligne (€)','Total Ligne Poids (kg)']);
        list.forEach(o => {
            (o.items || []).forEach(it => {
            const qty = Number(it.quantity)||0;
            const unitPrice = (typeof it.price === 'number') ? it.price : (prices[it.name] || 0);
            const unitWeight = (typeof it.unitWeight === 'number') ? it.unitWeight : Number(weights[it.name] || 0);
                const linePrice = unitPrice * qty;
                const lineWeight = unitWeight * qty;
                rows.push([
                    o.name || '',
                    o.email || '',
                    o.phone || '',
                    o.seasonName || o.seasonId || '',
                    it.name || '',
                    String(qty),
                    unitPrice ? unitPrice.toFixed(2) : '0.00',
                    unitWeight ? unitWeight.toFixed(3) : '0.000',
                    linePrice.toFixed(2),
                    lineWeight.toFixed(3)
                ]);
            });
        });
        const csv = rows.map(r => r.map(v => {
            const s = String(v).replace(/"/g,'""');
            return /[",;\n]/.test(s) ? '"'+s+'"' : s;
        }).join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'commandes.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Chargement et rendu des utilisateurs
    async function fetchUsers() {
        try {
            const resp = await fetch('/api/get-users');
            const jr = await resp.json().catch(() => null);
            if (!resp.ok) {
                console.error('Erreur get-users:', jr && jr.message);
                renderUsers([]);
                return;
            }
            allUsers = (jr && jr.users) ? jr.users : [];
            renderUsers(allUsers);
        } catch (e) {
            console.error('Erreur réseau get-users:', e);
            renderUsers([]);
        }
    }

    function normalize(str) { return String(str || '').toLowerCase(); }

    function userMatchesQuery(user, q) {
        const nq = normalize(q);
        if (!nq) return true;
        const fields = [user.name, user.email, user.phone];
        return fields.some(f => normalize(f).includes(nq));
    }

    function renderUsers(list) {
        if (!adminUsersList) return;
        const q = adminUserSearchQuery ? adminUserSearchQuery.value : '';
        const filtered = list.filter(u => userMatchesQuery(u, q));
        if (filtered.length === 0) {
            adminUsersList.innerHTML = '<div class="alert alert-info">Aucun utilisateur</div>';
            return;
        }
        const items = filtered.map(u => {
            const name = u.name || (u.email ? u.email.split('@')[0] : '—');
            const email = u.email || '—';
            const phone = u.phone || '';
            const details = `<div class="mt-2 small"><div>📧 ${email}</div>${phone ? `<div>📞 ${phone}</div>` : ''}</div>`;
            return `<a href="#" class="list-group-item list-group-item-action" data-user-id="${u.id}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div><strong>${name}</strong></div>
                            <span class="badge bg-secondary">Cliquer pour détails</span>
                        </div>
                        <div class="user-details d-none">${details}</div>
                    </a>`;
        }).join('');
        adminUsersList.innerHTML = items;
        // Toggle details on click
        adminUsersList.querySelectorAll('.list-group-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const details = item.querySelector('.user-details');
                if (details) details.classList.toggle('d-none');
            });
        });
    }

    if (adminUserSearchQuery) {
        adminUserSearchQuery.addEventListener('input', () => {
            renderUsers(allUsers);
        });
    }
    if (adminUsersReload) {
        adminUsersReload.addEventListener('click', async () => {
            showPageLoader('Chargement des utilisateurs…');
            try { await fetchUsers(); } finally { hidePageLoader(); }
        });
    }
});
