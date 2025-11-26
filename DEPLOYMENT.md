# 🚀 Guide de Déploiement sur Vercel

## Méthode 1: Via l'interface Web Vercel (Recommandée)

### Étape 1: Préparation
✅ Votre code est déjà sur GitHub: `https://github.com/fininhop/commande-de-pain`

### Étape 2: Connexion à Vercel
1. Visitez [vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur "Add New Project"

### Étape 3: Import du Projet
1. Cherchez et sélectionnez le dépôt `fininhop/commande-de-pain`
2. Cliquez sur "Import"

### Étape 4: Configuration du Projet
Vercel détectera automatiquement votre configuration. Vérifiez:
- **Framework Preset**: Other
- **Build Command**: (laisser vide ou utiliser celui de vercel.json)
- **Output Directory**: `.` (racine)
- **Install Command**: (laisser par défaut)

### Étape 5: Variables d'Environnement ⚠️ IMPORTANT
Ajoutez ces variables dans les paramètres:

```
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
ADMIN_TOKEN=YOUR_SECURE_ADMIN_TOKEN
```

**Comment obtenir les clés Firebase:**
1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet
3. Allez dans Project Settings ⚙️
4. Sous "Your apps", trouvez votre app web
5. Copiez les valeurs de configuration

### Étape 6: Déploiement
1. Cliquez sur "Deploy"
2. Attendez que le déploiement se termine (2-3 minutes)
3. Votre site sera disponible à: `https://commande-de-pain.vercel.app` (ou similaire)

### Étape 7: Configuration Post-Déploiement
1. Testez la connexion: `/index.html`
2. Testez l'inscription: `/register.html`
3. Testez l'admin: `/admin.html` avec votre token

---

## Méthode 2: Via Vercel CLI (Avancée)

### Installation
```bash
npm install -g vercel
```

### Login
```bash
vercel login
```

### Déploiement
```bash
cd /home/cattac/Documents/MyScripts/livraison-de-pain/commande-de-pain
vercel
```

### Configuration des Variables
```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
vercel env add ADMIN_TOKEN
```

### Redéploiement avec les Variables
```bash
vercel --prod
```

---

## ✅ Vérification du Déploiement

### URLs à Tester:
- 🏠 Page d'accueil: `https://votre-projet.vercel.app/`
- 🔐 Connexion: `https://votre-projet.vercel.app/index.html`
- 📝 Inscription: `https://votre-projet.vercel.app/register.html`
- 🛒 Commande: `https://votre-projet.vercel.app/order.html`
- 📋 Mes commandes: `https://votre-projet.vercel.app/my-orders.html`
- 👨‍💼 Admin: `https://votre-projet.vercel.app/admin.html`

### Checklist Post-Déploiement:
- [ ] Les variables d'environnement sont configurées
- [ ] Firebase Firestore est activé
- [ ] Les règles Firestore permettent l'accès (ajustez selon vos besoins)
- [ ] L'inscription fonctionne
- [ ] La connexion fonctionne
- [ ] Les commandes sont enregistrées
- [ ] L'interface admin est accessible avec le token
- [ ] Les APIs serverless fonctionnent

---

## 🔧 Dépannage

### Erreur: "Firebase is not defined"
➡️ Vérifiez que les variables d'environnement sont bien configurées dans Vercel

### Erreur 500 sur les APIs
➡️ Vérifiez les logs Vercel: Settings → Functions → Logs

### Les commandes ne s'enregistrent pas
➡️ Vérifiez les règles Firestore et les permissions

### Token admin ne fonctionne pas
➡️ Vérifiez que `ADMIN_TOKEN` est bien défini dans les variables d'environnement Vercel

---

## 🔄 Déploiements Automatiques

Une fois configuré, chaque push sur la branche `main` déclenchera automatiquement un nouveau déploiement sur Vercel! 🎉

```bash
git add .
git commit -m "votre message"
git push origin main
```

Vercel détectera le push et redéploiera automatiquement! ✨
