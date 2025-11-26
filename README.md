# 🍞 Commande de Pain Bio

Application web pour la gestion de commandes de pain bio cuit au feu de bois.

## 🚀 Fonctionnalités

### Pour les Clients
- ✅ Inscription et connexion sécurisée
- ✅ Commande de pain avec sélection de produits
- ✅ Visualisation de l'historique des commandes
- ✅ Option de renouvellement automatique des commandes
- ✅ Interface responsive et intuitive

### Pour les Administrateurs
- ✅ Interface d'administration protégée par token
- ✅ Visualisation de toutes les commandes
- ✅ Édition et suppression de commandes
- ✅ Accès sécurisé via `admin.html`

## 🛠️ Technologies

- **Frontend**: HTML, CSS, Bootstrap 5, JavaScript
- **Backend**: Vercel Serverless Functions
- **Base de données**: Firebase Firestore
- **Déploiement**: Vercel

## 📦 Structure du Projet

```
commande-de-pain/
├── index.html              # Page de connexion
├── register.html           # Page d'inscription
├── order.html              # Page de commande (client)
├── my-orders.html          # Historique des commandes (client)
├── admin.html              # Interface d'administration
├── gestionnaire.html       # Redirection vers admin
├── api/                    # Fonctions serverless
│   ├── save-order.js       # Enregistrer une commande
│   ├── get-orders.js       # Récupérer les commandes
│   ├── get-orders-by-user.js # Commandes par utilisateur
│   ├── update-order.js     # Modifier une commande
│   ├── delete-order.js     # Supprimer une commande
│   ├── save-user.js        # Enregistrer un utilisateur
│   ├── verify-user.js      # Vérifier les credentials
│   └── find-user.js        # Rechercher un utilisateur
└── config.js               # Configuration Firebase
```

## 🚀 Déploiement sur Vercel

### Prérequis
1. Compte Vercel
2. Projet Firebase avec Firestore activé
3. Dépôt GitHub

### Configuration

1. **Connectez votre dépôt GitHub à Vercel**
   - Visitez [vercel.com](https://vercel.com)
   - Cliquez sur "Add New Project"
   - Importez votre dépôt GitHub

2. **Configurez les variables d'environnement**
   
   Dans les paramètres Vercel, ajoutez :
   
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
   NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
   ADMIN_TOKEN=votre_token_admin_securise
   ```

3. **Déployez**
   - Vercel détectera automatiquement la configuration
   - Le déploiement se lancera automatiquement

## 🔐 Sécurité

- Les mots de passe ne sont **pas** stockés (authentification basique par email)
- L'interface d'administration est protégée par token
- Accès à l'administration uniquement via URL directe (`/admin.html`)
- Pas de liens vers l'administration dans l'interface client

## 📝 Produits Disponibles

- 🥖 Pain Blanc (400g, 800g, 1kg)
- 🌾 Pain Complet (400g, 800g, 1kg)
- 🌻 Pain aux Céréales (400g, 800g, 1kg)
- 🌿 Pain d'Épeautre (400g, 800g, 1kg)
- 🥐 Pain au Sarrazin

## 👥 Utilisation

### Client
1. Inscrivez-vous via `/register.html`
2. Connectez-vous via `/index.html`
3. Passez commande via `/order.html`
4. Consultez vos commandes via `/my-orders.html`

### Administrateur
1. Accédez directement à `/admin.html`
2. Entrez le token d'administration
3. Gérez toutes les commandes

## 📄 Licence

Ce projet est privé et destiné à un usage spécifique.

## 🤝 Support

Pour toute question ou problème, contactez l'administrateur du système.
