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
    const container = document.getElementById('ordersList');
    const logout = document.getElementById('logoutLink');

    const stored = localStorage.getItem('currentUser');
    let currentUser = null;
    try { currentUser = stored ? JSON.parse(stored) : null; } catch(e) { currentUser = null; }

    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    if (logout) {
        logout.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('currentUser'); window.location.href = 'index.html'; });
    }

    try {
        const response = await fetch('/api/get-orders-by-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId, email: currentUser.email })
        });

        let result = null;
        try { result = await response.json(); } catch (e) { result = null; }

        if (!response.ok) {
            showToast('❌ Erreur', 'Erreur lors de la récupération: ' + (result && result.message ? result.message : response.statusText), 'error');
            container.innerHTML = '<div class="alert alert-warning">Impossible de charger les commandes.</div>';
            return;
        }

        const orders = (result && result.orders) ? result.orders : [];
        if (!orders.length) {
            container.innerHTML = '<div class="alert alert-light text-center py-5"><h5>Aucune commande trouvée</h5><p class="text-muted">Vous n\'avez pas encore passé de commande.</p><a href="index.html" class="btn btn-primary">Commander maintenant</a></div>';
            return;
        }

        container.innerHTML = '';
        orders.forEach(o => {
            const card = document.createElement('div');
            card.className = 'order-card';
            const rn = (o.renouveler || '').toString().trim().toLowerCase();
            const dateCmd = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
            
            const itemsHtml = (o.items || []).map(it => 
                `<div class="item-row"><span>${it.quantity} × ${it.name}</span><span class="text-muted">${it.price ? '€ '+it.price.toFixed(2) : ''}</span></div>`
            ).join('');
            
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
                    <div class="info-item">
                        <span class="info-label">🔄 Renouveler:</span>
                        <span class="badge ${rn === 'oui' ? 'bg-success' : 'bg-secondary'}">${rn || '—'}</span>
                    </div>
                </div>
                <div class="items-section">
                    <div class="items-title">🛍️ Articles commandés</div>
                    ${itemsHtml}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error('Erreur récupération commandes:', err);
        showToast('❌ Erreur réseau', 'Impossible de charger les commandes.', 'error');
        container.innerHTML = '<div class="alert alert-warning">Erreur réseau. Réessayez plus tard.</div>';
    }
});
