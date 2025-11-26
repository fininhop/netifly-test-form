// script-admin.js - Interface d'administration simple (token-based)
document.addEventListener('DOMContentLoaded', () => {
    const adminLogin = document.getElementById('adminLogin');
    const adminArea = document.getElementById('adminArea');
    const adminForm = document.getElementById('adminLoginForm');
    const tokenInput = document.getElementById('adminTokenInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const ordersTableContainer = document.getElementById('ordersTableContainer');
    const adminMessage = document.getElementById('adminMessage');
    const logoutAdmin = document.getElementById('logoutAdmin');

    function showMessage(text, type='') {
        adminMessage.innerHTML = text ? `<div class="text-${type}">${text}</div>` : '';
    }

    function renderOrders(orders) {
        if (!orders || !orders.length) {
            ordersTableContainer.innerHTML = '<div class="alert alert-info">Aucune commande trouvée.</div>';
            return;
        }
        let html = '<table class="table table-sm table-striped">';
        html += '<thead><tr><th>Id</th><th>Date Cmd</th><th>Nom</th><th>Contact</th><th>Retrait</th><th>Articles</th><th>Actions</th></tr></thead><tbody>';
        orders.forEach(o => {
            const items = (o.items || []).map(it => `${it.quantity}× ${it.name}`).join('<br>');
            html += `<tr class="order-row" data-order-id="${o.id}">` +
                `<td>${o.id}</td><td>${o.createdAt || '—'}</td><td>${o.name}</td>` +
                `<td>${o.email}<br>${o.phone}</td><td>${o.date || '—'}</td><td>${items}</td>` +
                `<td>` +
                    `<button class="btn btn-sm btn-outline-danger btn-delete">Supprimer</button> ` +
                    `<button class="btn btn-sm btn-outline-secondary btn-edit">Éditer</button>` +
                `</td>` +
            `</tr>`;
        });
        html += '</tbody></table>';
        ordersTableContainer.innerHTML = html;

        // Attacher écouteurs aux boutons
        ordersTableContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const orderId = tr && tr.getAttribute('data-order-id');
                if (!orderId) return;
                if (!confirm('Confirmer la suppression de la commande ' + orderId + ' ?')) return;
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
                        // Retirer la ligne
                        tr.remove();
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
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const orderId = tr && tr.getAttribute('data-order-id');
                if (!orderId) return;
                // Simple prompt-based edit: modifier date et renouveler
                const newDate = prompt('Nouvelle date de retrait (YYYY-MM-DD) — laisser vide pour ne pas changer:');
                const newRen = prompt('Renouveler ? (oui/non) — laisser vide pour ne pas changer:');
                const updates = {};
                if (newDate) updates.date = newDate;
                if (newRen) updates.renouveler = newRen;
                if (Object.keys(updates).length === 0) return;
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
                        // Rafraîchir la liste pour afficher changements
                        fetchAdminOrders(token);
                    } else {
                        showMessage('Erreur mise à jour: ' + (jr && jr.message ? jr.message : resp.statusText), 'danger');
                    }
                } catch (err) {
                    console.error('Erreur update:', err);
                    showMessage('Erreur réseau lors de la mise à jour', 'danger');
                }
            });
        });
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

            renderOrders(result.orders || []);
            showMessage('Chargé: ' + (result.orders ? result.orders.length : 0) + ' commandes', 'success');
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
    }

    adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const token = tokenInput.value.trim();
        if (!token) return;
        localStorage.setItem('adminToken', token);
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        fetchAdminOrders(token);
    });

    refreshBtn.addEventListener('click', () => {
        const t = localStorage.getItem('adminToken');
        if (!t) { showMessage('Token manquant', 'danger'); return; }
        fetchAdminOrders(t);
    });

    logoutAdmin.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        adminArea.classList.add('d-none');
        adminLogin.classList.remove('d-none');
        ordersTableContainer.innerHTML = '';
        showMessage('Déconnecté');
    });
});
