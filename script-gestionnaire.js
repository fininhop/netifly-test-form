// =======================================================
// FICHIER : script-gestionnaire.js (CODE CLIENT)
// Gère l'affichage, le tri, la pagination et les options des commandes
// =======================================================

const ITEMS_PER_PAGE = 15;
let allOrders = [];
let currentPage = 1;
let currentSortField = 'createdAt';
let currentSortDirection = 'desc';

// Rendre la fonction accessible globalement pour le bouton "Actualiser"
window.fetchOrders = async function() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!ordersTableBody || !loadingMessage || !errorMessage) {
        console.error('Erreur: Les éléments DOM ne sont pas chargés');
        return;
    }
    
    // Affichage initial du chargement
    loadingMessage.textContent = 'Chargement des commandes...';
    ordersTableBody.innerHTML = '';
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');

    try {
        // Appel de la fonction Serverless Vercel
        console.log('Fetching orders from /api/get-orders...');
        const response = await fetch('/api/get-orders');

        if (!response.ok) {
            let errorResult = { message: `Erreur HTTP ${response.status}` };
            try {
                errorResult = await response.json();
            } catch (e) { /* Pas de JSON si le serveur a planté */ }
            console.error('API Response Error:', errorResult);
            throw new Error(errorResult.message || `Erreur HTTP ${response.status}`);
        }

        const result = await response.json();
        allOrders = result.orders || [];

        loadingMessage.textContent = '';

        if (!allOrders || allOrders.length === 0) {
            console.log('No orders found');
            ordersTableBody.innerHTML = '<tr><td colspan="7">Aucune commande trouvée.</td></tr>';
            document.getElementById('paginationContainer').innerHTML = '';
            return;
        }

        // Trier par date décroissante par défaut
        currentPage = 1;
        sortOrders(currentSortField, currentSortDirection);
        renderPage();

    } catch (error) {
        console.error('Erreur de connexion à l\'API:', error);
        loadingMessage.textContent = '';
        errorMessage.textContent = `Échec de la récupération : ${error.message}. Vérifiez les variables Vercel/Firebase Admin.`;
        errorMessage.classList.remove('hidden');
    }
}

// Fonction pour le formatage de la date/heure
function formatDateTime(isoString) {
    try {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('fr-FR', options);
    } catch (e) {
        return isoString;
    }
}

// Fonction de tri
function sortOrders(field, direction = 'asc') {
    currentSortField = field;
    currentSortDirection = direction;
    currentPage = 1; // Réinitialiser à la première page

    allOrders.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Traitement spécial pour les dates
        if (field === 'createdAt') {
            aVal = new Date(aVal) || new Date(0);
            bVal = new Date(bVal) || new Date(0);
        }

        // Traitement pour les chaînes
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderPage();
}

// Fonction pour afficher une page
function renderPage() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    ordersTableBody.innerHTML = '';

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageOrders = allOrders.slice(startIndex, endIndex);

    pageOrders.forEach(order => {
        const row = ordersTableBody.insertRow();
        
        // Cellule checkbox
        const checkboxCell = row.insertCell(0);
        checkboxCell.innerHTML = `<input type="checkbox" class="order-checkbox" data-order-id="${order.id}">`;
        
        // Formatage de la liste des articles
        const itemsList = `<ul class="items-list">${(order.items || []).map(item => 
            `<li><strong>${item.quantity}</strong> x ${item.name}</li>`
        ).join('')}</ul>`;

        row.insertCell(1).textContent = formatDateTime(order.createdAt);
        row.insertCell(2).textContent = order.name;
        row.insertCell(3).innerHTML = `Email: ${order.email}<br>Tél: ${order.phone || 'N/A'}`;
        row.insertCell(4).textContent = order.date;
        row.insertCell(5).textContent = order.renouveler === 'oui' ? '✅ Oui' : '❌ Non';
        row.insertCell(6).innerHTML = itemsList;
        
        // Cellule d'actions (Options)
        const actionsCell = row.insertCell(7);
        actionsCell.innerHTML = `
            <button class="action-btn" onclick="showOrderOptions('${order.id}', '${order.name}', '${order.email}', '${order.phone || ''}')">
                ⋮ Options
            </button>
        `;
    });

    // Créer la pagination
    createPagination();
    
    // Ajouter les event listeners aux checkboxes
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionsBar);
    });
}

// Fonction pour créer les boutons de pagination
function createPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(allOrders.length / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    // Bouton Précédent
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Précédent';
        prevBtn.className = 'pagination-btn';
        prevBtn.onclick = () => {
            currentPage--;
            renderPage();
            window.scrollTo(0, 0);
        };
        paginationContainer.appendChild(prevBtn);
    }

    // Numéros de page
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'pagination-btn active' : 'pagination-btn';
        pageBtn.onclick = () => {
            currentPage = i;
            renderPage();
            window.scrollTo(0, 0);
        };
        paginationContainer.appendChild(pageBtn);
    }

    // Bouton Suivant
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Suivant →';
        nextBtn.className = 'pagination-btn';
        nextBtn.onclick = () => {
            currentPage++;
            renderPage();
            window.scrollTo(0, 0);
        };
        paginationContainer.appendChild(nextBtn);
    }

    // Afficher le nombre de page actuelle
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${currentPage} sur ${totalPages} (${allOrders.length} commandes)`;
    paginationContainer.appendChild(pageInfo);
}

// Fonction pour afficher les options
window.showOrderOptions = function(orderId, orderName, orderEmail, orderPhone) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'optionsModal';
    // Build modal content with conditional phone button (only on Android)
    const sanitizedPhone = (orderPhone || '').trim();
    const hasPhone = isValidPhoneNumber(sanitizedPhone);
    const isAndroid = /android/.test(navigator.userAgent.toLowerCase());

    let buttonsHtml = '';
    buttonsHtml += `<button class="modal-btn email-btn" onclick="openEmailClient('${orderEmail}', '${orderName}', '${sanitizedPhone.replace(/'/g, "\\'")}')">📧 Envoyer un Email</button>`;
    // Only show call button on Android devices
    if (hasPhone && isAndroid) {
        buttonsHtml += `<button class="modal-btn phone-btn" onclick="window.location.href='tel:${sanitizedPhone.replace(/[^0-9+\- ]/g,'')}'; document.getElementById('optionsModal').remove();">📞 Appeler</button>`;
    }
    buttonsHtml += `<button class="modal-btn delete-btn" onclick="deleteOrder('${orderId}', '${orderName}')">🗑️ Supprimer la Commande</button>`;
    buttonsHtml += `<button class="modal-btn cancel-btn" onclick="document.getElementById('optionsModal').remove()">❌ Annuler</button>`;

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="document.getElementById('optionsModal').remove()">×</span>
            <h2>Options pour ${orderName}</h2>
            <div class="modal-buttons">${buttonsHtml}</div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Phone validation helper — simple but practical
function isValidPhoneNumber(phone) {
    if (!phone) return false;
    // Accept digits, spaces, +, dash, parentheses — require at least 6 digits
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 6) return false;
    // Basic pattern check (allow + at start)
    const normalized = phone.trim();
    return /^\+?[0-9 ()\-]+$/.test(normalized);
}

// Fonction pour ouvrir le client email
window.openEmailClient = function(email, orderName, phone) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipot/.test(userAgent);
    const isDesktop = !isAndroid && !isIOS;

    const subject = encodeURIComponent(`Commande de Pain Bio - ${orderName}`);
    const body = encodeURIComponent(`Bonjour ${orderName},\n\nConcernant votre commande de pain bio...\n\nCordialement,\nÉquipe Pain Bio`);
    const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&to=${email}&su=${subject}&body=${body}`;
    const yahooUrl = `https://compose.mail.yahoo.com/?to=${email}&subject=${subject}&body=${body}`;

    if (isAndroid || isIOS) {
        // Sur mobile, proposer email et appel
        const mobileModal = document.createElement('div');
        mobileModal.className = 'modal';
        mobileModal.id = 'mobileActionsModal';
        mobileModal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('mobileActionsModal').remove()">×</span>
                <h2>Choisir une action</h2>
                <div class="modal-buttons">
                    <button class="modal-btn email-btn" onclick="window.location.href = 'mailto:${email}?subject=${subject}&body=${body}'; document.getElementById('mobileActionsModal').remove(); document.getElementById('optionsModal').remove();">
                        📧 Envoyer un Email
                    </button>
                    <button class="modal-btn phone-btn" onclick="window.location.href = 'tel:${(phone || '').replace(/[^0-9+\- ]/g, '') || email.replace(/[^0-9+\- ]/g, '')}'; document.getElementById('mobileActionsModal').remove(); document.getElementById('optionsModal').remove();">
                        📞 Appeler
                    </button>
                    <button class="modal-btn cancel-btn" onclick="document.getElementById('mobileActionsModal').remove()">
                        ❌ Annuler
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(mobileModal);
    } else if (isDesktop) {
        // Sur desktop, proposer un choix
        const emailModal = document.createElement('div');
        emailModal.className = 'modal';
        emailModal.id = 'emailModal';
        emailModal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('emailModal').remove()">×</span>
                <h2>Choisir un client email</h2>
                <div class="modal-buttons">
                    <button class="modal-btn" onclick="window.open('${gmailUrl}', '_blank'); document.getElementById('emailModal').remove(); document.getElementById('optionsModal').remove();">
                        Gmail
                    </button>
                    <button class="modal-btn" onclick="window.open('${yahooUrl}', '_blank'); document.getElementById('emailModal').remove(); document.getElementById('optionsModal').remove();">
                        Yahoo
                    </button>
                    <button class="modal-btn" onclick="window.location.href = 'mailto:${email}?subject=${subject}&body=${body}'; document.getElementById('emailModal').remove(); document.getElementById('optionsModal').remove();">
                        Client Email par Défaut
                    </button>
                    <button class="modal-btn cancel-btn" onclick="document.getElementById('emailModal').remove()">
                        ❌ Annuler
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(emailModal);
    }

    // Fermer la première modal
    const optionsModal = document.getElementById('optionsModal');
    if (optionsModal && !isAndroid && !isIOS) {
        // Ne pas fermer immédiatement sur desktop pour laisser le temps de voir le menu email
    }
}

// Fonction pour supprimer une commande
window.deleteOrder = async function(orderId, orderName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande de ${orderName} ?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/delete-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });

        if (response.ok) {
            alert('Commande supprimée avec succès !');
            allOrders = allOrders.filter(order => order.id !== orderId);
            renderPage();
            const optionsModal = document.getElementById('optionsModal');
            if (optionsModal) optionsModal.remove();
        } else {
            const error = await response.json();
            alert(`Erreur: ${error.message}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur réseau lors de la suppression');
    }
}

// Fonction pour supprimer plusieurs commandes
window.deleteSelectedOrders = async function() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Veuillez sélectionner au moins une commande à supprimer.');
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${checkboxes.length} commande(s) ?`)) {
        return;
    }
    
    const orderIds = Array.from(checkboxes).map(cb => cb.dataset.orderId);
    
    try {
        const response = await fetch(`/api/delete-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds })
        });

        if (response.ok) {
            alert(`${checkboxes.length} commande(s) supprimée(s) avec succès !`);
            allOrders = allOrders.filter(order => !orderIds.includes(order.id));
            renderPage();
            // Réinitialiser les checkboxes
            document.getElementById('selectAllCheckbox').checked = false;
        } else {
            const error = await response.json();
            alert(`Erreur: ${error.message}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression multiple:', error);
        alert('Erreur réseau lors de la suppression');
    }
}

// Fonction pour mettre à jour la barre d'actions en masse
function updateBulkActionsBar() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkboxes.length > 0) {
        bulkActionsBar.classList.add('show');
        selectedCount.textContent = `${checkboxes.length} commande(s) sélectionnée(s)`;
    } else {
        bulkActionsBar.classList.remove('show');
        selectedCount.textContent = '0 sélectionné(s)';
        document.getElementById('selectAllCheckbox').checked = false;
    }
}

// Fonction pour mettre à jour la barre d'actions en masse
function updateBulkActionsBar() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (checkboxes.length > 0) {
        bulkActionsBar.classList.add('show');
        selectedCount.textContent = `${checkboxes.length} commande(s) sélectionnée(s)`;
    } else {
        bulkActionsBar.classList.remove('show');
        selectedCount.textContent = '0 sélectionné(s)';
        document.getElementById('selectAllCheckbox').checked = false;
    }
}

// Fonction pour sélectionner/désélectionner tous les checkboxes
window.toggleSelectAll = function(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
    });
    updateBulkActionsBar();
}

// Fonction pour utiliser les headers de tri
function setupSortHeaders() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.title = 'Cliquez pour trier';
        header.addEventListener('click', () => {
            const field = header.dataset.field;
            const direction = currentSortField === field && currentSortDirection === 'asc' ? 'desc' : 'asc';
            sortOrders(field, direction);
        });
    });
}

// Chargement automatique au démarrage de la page
document.addEventListener('DOMContentLoaded', () => {
    setupSortHeaders();
    // Detect Android devices and add class for targeting styles
    try {
        const ua = navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) {
            document.body.classList.add('android');
        }
    } catch (e) {
        // ignore
    }
    fetchOrders();
});