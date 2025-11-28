// script-my-orders.js - Affiche les commandes du user connecté (lecture seule)

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

document.addEventListener('DOMContentLoaded', async () => {
    let ORDERS_FP = '';
    let AUTO_REFRESH_HANDLE = null;
    function renderMyOrders(list) {
        try { return JSON.stringify((list||[]).map(o=>({id:String(o.id||''),ca:String(o.createdAt||''),d:String(o.date||''),len:(o.items||[]).length})).sort((a,b)=>a.id.localeCompare(b.id))); } catch(e){ return ''; }
    }
    showPageLoader('Chargement des commandes…');
    const container = document.getElementById('ordersList');
    const logout = document.getElementById('logoutLink');

        const items = list.map(o => {
            const endDateStr = o.date || o.seasonEndDate || '';
            let canCancel = false;
            let cancelInfo = '';
            if (endDateStr) {
                const now = new Date();
                const end = new Date(endDateStr);
                const diffMs = end.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                if (diffHours >= 48) {
                    canCancel = true;
                } else if (diffHours > 0) {
                    cancelInfo = `Annulation impossible: moins de 48h avant la fin de la saison (${Math.floor(diffHours)}h restantes).`;
                } else {
                    cancelInfo = 'Annulation impossible: la saison est terminée.';
                }
            } else {
                cancelInfo = 'Date de fin de saison inconnue.';
            }
    let currentUser = null;
    try { currentUser = stored ? JSON.parse(stored) : null; } catch(e) { currentUser = null; }

    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    if (logout) {
        logout.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('currentUser'); window.location.href = 'index.html'; });
    }

                                ${canCancel ? `<button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${o.id}">Annuler</button>` : `<span class="badge bg-secondary">Non annulable</span>`}
        const response = await fetch('/api/get-orders-by-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId, email: currentUser.email }),
                        ${(!canCancel && cancelInfo) ? `<div class="mt-2 alert alert-warning py-2 mb-0">${cancelInfo}</div>` : ''}
            cache: 'no-cache'
        });

        let result = null;
        try { result = await response.json(); } catch (e) { result = null; }

        container.querySelectorAll('button[data-action="cancel"]').forEach(btn => {
            showToast('❌ Erreur', 'Erreur lors de la récupération: ' + (result && result.message ? result.message : response.statusText), 'error');
            container.innerHTML = '<div class="alert alert-warning">Impossible de charger les commandes.</div>';
                if (!id) return;
                // Double-check 48h rule client-side using current order data
                const order = (CURRENT_MY_ORDERS || []).find(x => String(x.id||'') === String(id));
                const endDateStr = order && (order.date || order.seasonEndDate);
                if (!endDateStr) { showToast('❌ Erreur', 'Date de fin inconnue pour cette commande.', 'error'); return; }
                const now = new Date();
                const end = new Date(endDateStr);
                const diffHours = (end.getTime() - now.getTime()) / (1000*60*60);
                if (diffHours < 48) {
                    showToast('⏳ Trop tard', 'Annulation impossible: moins de 48h avant la fin de la saison.', 'warning');
                    return;
                }
                if (!confirm('Confirmer l\'annulation de cette commande ?')) return;
                try {
                    const r = await fetch(`/api/delete-order?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
                    const j = await r.json().catch(()=>({}));
                    if (r.ok && j && j.ok) {
                        showToast('✅ Annulée', 'Votre commande a été annulée.', 'success');
                        await fetchMyOrders();
                    } else {
                        showToast('❌ Erreur', (j && j.message) ? j.message : 'Annulation impossible', 'error');
                    }
                } catch(err) {
                    console.error('Annulation', err);
                    showToast('❌ Erreur réseau', 'Réessayez plus tard.', 'error');
                }
            const nk = normalizeKey(key);
            if (nk in map) return map[nk];
            // chercher correspondance insensible à la casse parmi les clés existantes
            for (const k of Object.keys(map)) { if (normalizeKey(k) === nk) return map[k]; }
            return undefined;
        }
        orders.forEach(o => {
            const card = document.createElement('div');
            card.className = 'order-card';
            const dateCmd = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
            
            const itemsHtml = (o.items || []).map(it => {
                const priceFromMap = resolveMap(NAME_PRICES, it.name);
                const unit = Number(priceFromMap !== undefined ? priceFromMap : (it.price || 0));
                const qty = Number(it.quantity) || 0;
                const weightFromMap = resolveMap(NAME_WEIGHTS, it.name);
                const unitWeight = Number(weightFromMap || 0);
                const line = unit * qty;
                const lineWeight = unitWeight * qty;
                return `<div class="item-row"><span>${qty} × ${it.name}</span><span class="text-muted">${`€${unit.toFixed(2)}`} /u • ${`€${line.toFixed(2)}`} ${unitWeight ? `• ${unitWeight.toFixed(3)} kg/u • ${lineWeight.toFixed(3)} kg` : ''}</span></div>`;
            }).join('');
            const total = (o.items || []).reduce((s, it) => {
                const priceFromMap = resolveMap(NAME_PRICES, it.name);
                const unit = Number(priceFromMap !== undefined ? priceFromMap : (it.price || 0));
                const qty = Number(it.quantity)||0;
                return s + unit * qty;
            }, 0);
            
            card.innerHTML = `
                <div class="order-header">
                    <div class="order-date">📅 ${dateCmd}</div>
                    <div class="order-id">ID: ${o.id}</div>
                </div>
                <div class="order-info">
                    <div class="info-item">
                        <span class="info-label">📍 Retrait:</span>
                        <span class="info-value">${o.date || '—'}</span>
                    </div>
                </div>
                <div class="items-section">
                    <div class="items-title">🛍️ Articles commandés</div>
                    ${itemsHtml}
                    <div class="text-end"><strong>Total:</strong> €${total.toFixed(2)}</div>
                </div>
            `;
            container.appendChild(card);
        });

    }

    try {
        await fetchAndRender();
        if (!AUTO_REFRESH_HANDLE) {
            AUTO_REFRESH_HANDLE = setInterval(async ()=>{
                try {
                    const response = await fetch('/api/get-orders-by-user', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUser.userId, email: currentUser.email }), cache: 'no-cache'
                    });
                    const result = await response.json().catch(()=>null);
                    if (!response.ok || !result) return;
                    const orders = result.orders || [];
                    const fp = computeFingerprint(orders);
                    if (fp !== ORDERS_FP) {
                        await fetchAndRender();
                    }
                } catch(e){ /* noop */ }
            }, 10000);
        }
    } catch (err) {
        console.error('Erreur récupération commandes:', err);
        showToast('❌ Erreur réseau', 'Impossible de charger les commandes.', 'error');
        container.innerHTML = '<div class="alert alert-warning">Erreur réseau. Réessayez plus tard.</div>';
    } finally {
        hidePageLoader();
    }
});
