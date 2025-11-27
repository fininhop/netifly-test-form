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

    // Prix connus pour calcul des totaux (par nom d'article)
    const NAME_PRICES = {
        'Blanc 400g': 3.60, 'Blanc 800g': 6.50, 'Blanc 1kg': 7.00,
        'Complet 400g': 3.60, 'Complet 800g': 6.50, 'Complet 1kg': 7.00,
        'Céréale 400g': 4.60, 'Céréale 800g': 8.50, 'Céréale 1kg': 9.00,
        'Épeautre 400g': 4.60, 'Épeautre 800g': 8.50, 'Épeautre 1kg': 9.00,
        'Sarrazin': 7.00,
        'Sarrazin': 7.00
    };

    function computeOrderTotal(order) {
        const items = order.items || [];
        return items.reduce((sum, it) => {
            const unit = (typeof it.price === 'number') ? it.price : (NAME_PRICES[it.name] || 0);
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
                case 'renouveler':
                    return 0;
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
        const editRen = null;
        const saveEditBtn = document.getElementById('saveEditBtn');

        ordersContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const date = card && card.getAttribute('data-order-date');
                const rn = null;
                if (!orderId || !modal) return;
                editOrderId.value = orderId;
                editDate.value = (date || '');
                    editRen.value = '';
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
            const response = await fetch('/api/get-orders-admin', { headers: { 'x-admin-token': token } });
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

    // Export PDF for selected season/week
    if (exportSeasonPdfBtn) {
        exportSeasonPdfBtn.addEventListener('click', () => {
            try {
                exportSeasonPdf();
            } catch (e) {
                console.error('Erreur export PDF:', e);
                showToast('❌ Erreur', 'Export PDF impossible', 'error');
            }
        });
    }

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

    function openSeasonModal(season) {
        if (!seasonModal) return;
        // Reset form
        if (seasonForm) seasonForm.reset();
        seasonIdInput.value = season && season.id ? season.id : '';
        seasonNameInput.value = season && season.name ? season.name : '';
        seasonStartInput.value = season && season.startDate ? new Date(season.startDate).toISOString().slice(0,10) : '';
        seasonEndInput.value = season && season.endDate ? new Date(season.endDate).toISOString().slice(0,10) : '';
        seasonDescInput.value = season && season.description ? season.description : '';

        const title = document.getElementById('seasonModalLabel');
        if (title) title.textContent = season ? 'Éditer la saison' : 'Nouvelle saison';
        seasonModal.show();
    }

    function exportSeasonPdf() {
        const list = currentSeasonFilter === 'all' ? currentOrders : currentOrders.filter(o => (o.seasonId || '') === currentSeasonFilter);
        const seasonName = (currentSeasons.find(s => s.id === currentSeasonFilter)?.name) || (currentSeasonFilter === 'all' ? 'Toutes les saisons' : currentSeasonFilter);
        const totalSum = list.reduce((s,o)=> s + computeOrderTotal(o), 0);

        // jsPDF
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { throw new Error('jsPDF non chargé'); }
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        const left = 40, topStart = 60; let y = topStart;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text(`Rapport commandes – ${seasonName}`, left, y);
        y += 24;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        doc.text(`Total commandes: ${list.length}`, left, y); y += 18;
        doc.text(`Total prix: €${totalSum.toFixed(2)}`, left, y); y += 24;

        // Table header
        doc.setFont('helvetica', 'bold');
        doc.text('Nom', left, y);
        doc.text('Total (€)', left + 420, y);
        y += 14;
        doc.setLineWidth(0.5); doc.line(left, y, left + 520, y);
        y += 10;
        doc.setFont('helvetica', 'normal');

        const lineHeight = 14; const pageHeight = doc.internal.pageSize.getHeight();
        list.forEach(o => {
            const name = o.name || '—';
            const total = computeOrderTotal(o).toFixed(2);

            if (y + lineHeight > pageHeight - 40) { doc.addPage(); y = topStart; }
            doc.text(String(name), left, y);
            doc.text(`€${total}`, left + 420, y);
            y += lineHeight;

            // Détails par commande: pains, quantités, prix unitaires et total ligne
            const items = Array.isArray(o.items) ? o.items : [];
            if (items.length) {
                // En-tête des items
                const itemLeft = left + 12;
                if (y + lineHeight > pageHeight - 40) { doc.addPage(); y = topStart; }
                doc.setFont('helvetica', 'italic');
                doc.text('Détails:', itemLeft, y);
                doc.setFont('helvetica', 'normal');
                y += lineHeight - 4;
                // Colonnes: Article, Qté, Prix unit., Total
                doc.setFontSize(10);
                items.forEach(it => {
                    const itName = String(it.name || '—');
                    const qty = Number(it.quantity || 0);
                    const unit = (typeof it.price === 'number') ? it.price : (NAME_PRICES[itName] || 0);
                    const lineTotal = (unit * qty).toFixed(2);
                    if (y + lineHeight > pageHeight - 40) { doc.addPage(); y = topStart; }
                    doc.text(itName, itemLeft, y);
                    doc.text(String(qty), itemLeft + 250, y);
                    doc.text(`€${unit.toFixed(2)}`, itemLeft + 300, y);
                    doc.text(`€${lineTotal}`, itemLeft + 380, y);
                    y += lineHeight - 2;
                });
                doc.setFontSize(11);
                y += 6;
            }
        });

        // Footer total
        if (y + 24 > pageHeight - 40) { doc.addPage(); y = topStart; }
        y += 10; doc.setLineWidth(0.5); doc.line(left, y, left + 520, y); y += 18;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total général: €${totalSum.toFixed(2)}`, left, y);

        const filename = `commandes_${seasonName.replace(/\s+/g,'_')}.pdf`;
        doc.save(filename);
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
