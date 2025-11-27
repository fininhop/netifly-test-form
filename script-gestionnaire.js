// script-gestionnaire.js - Gestionnaire admin protégé avec tri

let allOrders = [];
let filteredOrders = [];
let currentSort = { field: 'createdAt', direction: 'desc' };
let seasons = [];
let selectedSeason = '';

// Prix de référence pour calculer le total de commande par article
const NAME_PRICES = {
    'Blanc 400g': 3.60, 'Blanc 800g': 6.50, 'Blanc 1kg': 7.00,
    'Complet 400g': 3.60, 'Complet 800g': 6.50, 'Complet 1kg': 7.00,
    'Céréale 400g': 4.60, 'Céréale 800g': 8.50, 'Céréale 1kg': 9.00,
    'Épeautre 400g': 4.60, 'Épeautre 800g': 8.50, 'Épeautre 1kg': 9.00,
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

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('adminLoginScreen');
    const adminArea = document.getElementById('adminArea');
    const loginForm = document.getElementById('adminLoginForm');
    const tokenInput = document.getElementById('adminTokenInput');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutAdmin');
    const refreshBtn = document.getElementById('refreshBtn');
    const adminMessage = document.getElementById('adminMessage');
    const ordersTableContainer = document.getElementById('ordersTableContainer');
    const seasonFilterEl = document.getElementById('seasonFilter');
    const tabsEl = document.getElementById('gestionTabs');
    const userSearchEmail = document.getElementById('userSearchEmail');
    const userSearchBtn = document.getElementById('userSearchBtn');
    const usersAdminTbody = document.getElementById('usersAdminTbody');
    const userSearchMessage = document.getElementById('userSearchMessage');

    function showMessage(text, type = '') {
        adminMessage.innerHTML = text ? `<span class="text-${type}">${text}</span>` : '';
    }

    function showLoginError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('d-none');
    }

    function sortOrders(field) {
        if (currentSort.field === field) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.direction = 'asc';
        }
        filteredOrders.sort((a, b) => {
            let valA = a[field] || '';
            let valB = b[field] || '';
            if (field === 'createdAt') {
                valA = new Date(valA);
                valB = new Date(valB);
            }
            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
        renderOrders();
    }

    function renderOrders() {
        if (!filteredOrders || !filteredOrders.length) {
            ordersTableContainer.innerHTML = '<div class="alert alert-info">Aucune commande trouvée.</div>';
            return;
        }

        let html = '<table class="table table-sm table-striped table-hover">';
        html += '<thead class="table-light"><tr>';
        const headers = [
            { field: 'createdAt', label: '📅 Date Cmd' },
            { field: 'name', label: '👤 Nom' },
            { field: 'email', label: '📧 Email' },
            { field: 'phone', label: '📞 Téléphone' },
            { field: 'date', label: '📍 Retrait' },
            { field: 'total', label: '💶 Total (€)' }
        ];
        
        headers.forEach(h => {
            const sortClass = currentSort.field === h.field ? (currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
            html += `<th class="sortable ${sortClass}" data-field="${h.field}">${h.label}</th>`;
        });
        html += '<th>🛍️ Articles</th><th>⚙️ Actions</th></tr></thead><tbody>';

        filteredOrders.forEach(o => {
            const items = (o.items || []).map(it => `${it.quantity}× ${it.name}`).join(', ');
            const dateFormatted = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : '—';
            const orderTotal = computeOrderTotal(o);
            html += `<tr class="order-row" data-order-id="${o.id}" data-order-date="${o.date || ''}" data-order-ren="${rn}">`;
            html += `<td><small>${dateFormatted}</small></td>`;
            html += `<td>${o.name}</td>`;
            html += `<td><small>${o.email}</small></td>`;
            html += `<td><small>${o.phone}</small></td>`;
            html += `<td>${o.date || '—'}</td>`;
            html += `<td><strong>€ ${orderTotal.toFixed(2)}</strong></td>`;
            html += `<td><small>${items}</small></td>`;
            html += `<td><button class="btn btn-sm btn-outline-danger btn-delete me-1">Supprimer</button>`;
            html += `<button class="btn btn-sm btn-outline-secondary btn-edit">Éditer</button></td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
        ordersTableContainer.innerHTML = html;

        // Attacher handlers tri
        ordersTableContainer.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-field');
                sortOrders(field);
            });
        });

        // Modal edit
        const modalEl = document.getElementById('editModal');
        const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
        const editOrderId = document.getElementById('editOrderId');
        const editDate = document.getElementById('editDate');
        const editRen = null;
        const saveEditBtn = document.getElementById('saveEditBtn');

        ordersTableContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const orderId = tr && tr.getAttribute('data-order-id');
                if (!orderId) return;
                if (!confirm(`Supprimer la commande ${orderId} ?`)) return;
                const token = localStorage.getItem('adminToken');
                try {
                    const resp = await fetch('/api/delete-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showMessage('Commande supprimée', 'success');
                        tr.remove();
                        allOrders = allOrders.filter(o => o.id !== orderId);
                        applySeasonFilter();
                    } else {
                        showMessage('Erreur suppression: ' + (jr && jr.message ? jr.message : resp.statusText), 'danger');
                    }
                } catch (err) {
                    console.error('Erreur delete:', err);
                    showMessage('Erreur réseau lors de la suppression', 'danger');
                }
            });
        });

        ordersTableContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                const orderId = tr && tr.getAttribute('data-order-id');
                const date = tr && tr.getAttribute('data-order-date');
                const rn = null;
                if (!orderId || !modal) return;
                editOrderId.value = orderId;
                editDate.value = date || '';
                editRen.value = (rn === 'oui' || rn === 'non') ? rn : '';
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
                try {
                    const resp = await fetch('/api/update-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId, updates })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showMessage('Commande mise à jour', 'success');
                        modal.hide();
                        fetchAdminOrders(token);
                    } else {
                        showMessage('Erreur mise à jour: ' + (jr && jr.message ? jr.message : resp.statusText), 'danger');
                    }
                } catch (err) {
                    console.error('Erreur update:', err);
                    showMessage('Erreur réseau lors de la mise à jour', 'danger');
                }
            };
        }
    }

    async function fetchAdminOrders(token) {
        showMessage('Chargement...', 'muted');
        try {
            const response = await fetch('/api/get-orders-admin', { headers: { 'x-admin-token': token } });
            let result = null;
            try { result = await response.json(); } catch (e) { result = null; }

            if (!response.ok) {
                showMessage('Erreur: ' + (result && result.message ? result.message : response.statusText), 'danger');
                return;
            }

            allOrders = result.orders || [];
            applySeasonFilter();
            sortOrders(currentSort.field);
            showMessage(`${allOrders.length} commande(s) chargée(s)`, 'success');
        } catch (err) {
            console.error('Erreur admin fetch:', err);
            showMessage('Erreur réseau. Réessayez.', 'danger');
        }
    }

    async function fetchSeasons() {
        try {
            const resp = await fetch('/api/seasons');
            const jr = await resp.json().catch(() => []);
            seasons = Array.isArray(jr) ? jr : (jr.seasons || []);
            // sort by name desc as a proxy for most recent
            seasons.sort((a,b) => (b.name||'').localeCompare(a.name||''));
            // populate filter
            if (seasonFilterEl) {
                seasonFilterEl.innerHTML = '<option value="">Toutes</option>' +
                    seasons.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
                // default to most recent (first after sort)
                if (seasons.length) {
                    selectedSeason = seasons[0].name || '';
                    seasonFilterEl.value = selectedSeason;
                }
                seasonFilterEl.addEventListener('change', () => {
                    selectedSeason = seasonFilterEl.value;
                    applySeasonFilter();
                    sortOrders(currentSort.field);
                });
            }
            applySeasonFilter();
            sortOrders(currentSort.field);
            // render seasons list placeholder
            const seasonsList = document.getElementById('seasonsList');
            if (seasonsList) {
                seasonsList.innerHTML = seasons.map(s => `<span class="badge bg-light text-dark me-1">${s.name}</span>`).join('') || '<span class="text-muted">Aucune saison</span>';
            }
        } catch (e) {
            console.error('fetchSeasons error', e);
        }
    }

    function applySeasonFilter() {
        filteredOrders = selectedSeason ? (allOrders || []).filter(o => (o.season||'') === selectedSeason) : (allOrders || []);
    }

    function setupTabs() {
        if (!tabsEl) return;
        tabsEl.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                tabsEl.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const target = link.getAttribute('data-target');
                document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
                const el = document.querySelector(target);
                if (el) el.classList.add('active');
            });
        });
    }

    function isSmartphone() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        return /android|iphone|ipad|ipod|mobile/i.test(ua);
    }

    async function searchUserByEmail(email) {
        if (!email) return null;
        try {
            const resp = await fetch('/api/find-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const jr = await resp.json().catch(() => null);
            if (resp.ok) return jr && jr.user ? jr.user : null;
            return null;
        } catch (e) { return null; }
    }

    function renderUserRow(user) {
        const phone = user.phone || '';
        const email = user.email || '';
        const name = user.name || '';
        const canCall = isSmartphone() && phone;
        const canSms = isSmartphone() && phone;
        const mailLink = email ? `mailto:${email}` : '#';
        const callLink = canCall ? `tel:${phone}` : '#';
        const smsLink = canSms ? `sms:${phone}` : '#';
        const callBtn = `<a href="${callLink}" class="btn btn-sm btn-outline-primary ${canCall?'':'disabled'}" ${canCall?'':'aria-disabled="true"'}>📞 Appeler</a>`;
        const smsBtn = `<a href="${smsLink}" class="btn btn-sm btn-outline-success ${canSms?'':'disabled'}" ${canSms?'':'aria-disabled="true"'}>💬 SMS</a>`;
        const mailBtn = `<a href="${mailLink}" class="btn btn-sm btn-outline-secondary ${email?'':'disabled'}" ${email?'':'aria-disabled="true"'}>✉️ Mail</a>`;
        return `<tr><td>${name}</td><td>${email}</td><td>${phone}</td><td class="d-flex gap-2 flex-wrap">${mailBtn}${callBtn}${smsBtn}</td></tr>`;
    }

    function setupUserAdmin() {
        if (!userSearchBtn) return;
        userSearchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = (userSearchEmail && userSearchEmail.value || '').trim().toLowerCase();
            if (!email) {
                userSearchMessage.innerHTML = '<span class="text-danger">Veuillez entrer un email.</span>';
                return;
            }
            userSearchMessage.innerHTML = '<span class="text-muted">Recherche…</span>';
            const user = await searchUserByEmail(email);
            if (user) {
                usersAdminTbody.innerHTML = renderUserRow(user);
                userSearchMessage.innerHTML = '<span class="text-success">Utilisateur trouvé.</span>';
            } else {
                usersAdminTbody.innerHTML = '<tr><td colspan="4" class="text-muted">Aucun utilisateur</td></tr>';
                userSearchMessage.innerHTML = '<span class="text-warning">Aucun utilisateur pour cet email.</span>';
            }
        });
    }

    // Auto-login si token stocké
    setupTabs();
    setupUserAdmin();
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
        loginScreen.classList.add('d-none');
        adminArea.classList.remove('d-none');
        fetchSeasons();
        fetchAdminOrders(storedToken);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = tokenInput.value.trim();
        if (!token) return;
        
        loginError.classList.add('d-none');
        showMessage('Vérification...', 'muted');
        disableForm(loginForm);
        showPageLoader('Connexion gestionnaire…');

        try {
            const resp = await fetch('/api/get-orders-admin', { headers: { 'x-admin-token': token } });
            if (resp.ok) {
                localStorage.setItem('adminToken', token);
                loginScreen.classList.add('d-none');
                adminArea.classList.remove('d-none');
                fetchSeasons();
                fetchAdminOrders(token);
            } else {
                showLoginError('Token incorrect ou accès refusé');
            }
        } catch (err) {
            showLoginError('Erreur réseau. Réessayez.');
        } finally {
            enableForm(loginForm);
            hidePageLoader();
        }
    });

    refreshBtn.addEventListener('click', async () => {
        const t = localStorage.getItem('adminToken');
        if (!t) { showMessage('Token manquant', 'danger'); return; }
        showPageLoader('Actualisation des données…');
        try { await fetchAdminOrders(t); } finally { hidePageLoader(); }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        adminArea.classList.add('d-none');
        loginScreen.classList.remove('d-none');
        ordersTableContainer.innerHTML = '';
        allOrders = [];
        filteredOrders = [];
        seasons = [];
        selectedSeason = '';
        showMessage('');
    });
});
