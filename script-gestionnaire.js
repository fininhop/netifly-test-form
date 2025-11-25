// =======================================================
// FICHIER : script-gestionnaire.js (CODE CLIENT)
// Gère l'affichage des commandes récupérées via l'API Vercel /api/get-orders
// =======================================================

// Rendre la fonction accessible globalement pour le bouton "Actualiser"
window.fetchOrders = async function() {
    // Vérifier que les éléments DOM existent avant de continuer
    const ordersTableBody = document.getElementById('ordersTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!ordersTableBody || !loadingMessage || !errorMessage) {
        console.error('Erreur: Les éléments DOM ne sont pas chargés');
        return;
    }
    
    // Fonction pour le formatage de la date/heure
    function formatDateTime(isoString) {
        try {
            if (!isoString) return 'N/A';
            const date = new Date(isoString);
            // Format pour la date de commande
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return date.toLocaleDateString('fr-FR', options);
        } catch (e) {
            return isoString;
        }
    }

    // Affichage initial du chargement
    loadingMessage.textContent = 'Chargement des commandes...';
    ordersTableBody.innerHTML = '';
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');

    try {
        // Appel de la fonction Serverless Vercel
        const response = await fetch('/api/get-orders');

        if (!response.ok) {
            // Tenter de lire le message d'erreur JSON de l'API
            let errorResult = { message: `Erreur HTTP ${response.status}` };
            try {
                 errorResult = await response.json();
            } catch(e) { /* Pas de JSON si le serveur a planté */ }
            
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

            row.insertCell(0).textContent = formatDateTime(order.createdAt); // Date Commande
            row.insertCell(1).textContent = order.name; // Nom Client
            // Combinaison Email et Téléphone
            row.insertCell(2).innerHTML = `Email: ${order.email}<br>Tél: ${order.phone || 'N/A'}`; 
            row.insertCell(3).textContent = order.date; // Date Retrait
            row.insertCell(4).textContent = order.renouveler === 'oui' ? '✅ Oui' : '❌ Non'; // Renouvellement
            row.insertCell(5).innerHTML = itemsList; // Articles
        });

    } catch (error) {
        console.error('Erreur de connexion à l\'API:', error);
        loadingMessage.textContent = '';
        errorMessage.textContent = `Échec de la récupération : ${error.message}. Vérifiez les variables Vercel/Firebase Admin.`;
        errorMessage.classList.remove('hidden');
    }
}

// Chargement automatique au démarrage de la page
document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});stener('DOMContentLoaded', () => {
    fetchOrders();
});
