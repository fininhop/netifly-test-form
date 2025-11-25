// =======================================================
// FICHIER : script-gestionnaire.js
// Gère l'affichage des commandes récupérées via l'API Vercel /api/get-orders
// =======================================================

// Rendre la fonction accessible globalement pour le bouton "Actualiser"
window.fetchOrders = async function() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
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

    loadingMessage.textContent = 'Chargement des commandes...';
    ordersTableBody.innerHTML = '';
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');

    try {
        const response = await fetch('/api/get-orders');

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Erreur HTTP ${response.status}`);
        }

        const result = await response.json();
        const orders = result.orders;

        loadingMessage.textContent = '';

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6">Aucune commande trouvée.</td></tr>';
            return;
        }

        // Construction du tableau HTML
        orders.forEach(order => {
            const row = ordersTableBody.insertRow();
            
            // Formatage de la liste des articles
            const itemsList = `<ul class="items-list">${order.items.map(item => 
                `<li><strong>${item.quantity}</strong> x ${item.name}</li>`
            ).join('')}</ul>`;

            row.insertCell(0).textContent = formatDateTime(order.createdAt);
            row.insertCell(1).textContent = order.name;
            // Combinaison Email et Téléphone
            row.insertCell(2).innerHTML = `Email: ${order.email}<br>Tél: ${order.phone || 'N/A'}`; 
            row.insertCell(3).textContent = order.date;
            row.insertCell(4).textContent = order.renouveler === 'oui' ? '✅ Oui' : '❌ Non';
            row.insertCell(5).innerHTML = itemsList;
        });

    } catch (error) {
        console.error('Erreur de connexion à l\'API:', error);
        loadingMessage.textContent = '';
        errorMessage.textContent = `Échec de la récupération des commandes : ${error.message}. Vérifiez les variables d'environnement Vercel/Firebase.`;
        errorMessage.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});
