# Commande de Pain — Déploiement Vercel

Ce projet est une app statique avec des fonctions API (Node) sur Vercel.

## Variables d’environnement (Vercel → Project Settings → Environment Variables)
- `NEXT_PUBLIC_FIREBASE_API_KEY`: clé Web Firebase
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: domaine auth (ex: projet.firebaseapp.com)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: ID projet
- `NEXT_PUBLIC_FIREBASE_APP_ID`: App ID
- `FIREBASE_SERVICE_ACCOUNT`: JSON du compte de service Firebase Admin
  - Important: dans Vercel, le champ `private_key` doit avoir les sauts de ligne échappés `\n`
- `ADMIN_TOKEN`: token administrateur (ex: `12345678S`)

## Fichiers importants
- `vercel.json`: génère `config.js` à partir des variables `NEXT_PUBLIC_*` (buildCommand)
- `api/_http.js`: polyfills `res.status`/`res.json` et parseur JSON pour Vercel (Node sans Express)
- `api/*.js`: fonctions serverless (Firestore via `firebase-admin`)
- `api/seasons-public.js`: endpoint public (GET) pour lister les saisons
- `middleware/admin-only.js`: vérifie l’en-tête `x-admin-token`
- Pages: `index.html`, `register.html`, `order.html`, `admin.html`

## Déploiement
1. Connecter le repo GitHub à Vercel (Framework Preset: "Other")
2. Laisser `Build Command` vide (Vercel utilisera `vercel.json`), `Output Directory` vide
3. Définir les variables d’environnement (Production et Preview)
4. Déployer
5. En cas d’incohérences après un changement de routes/API, utiliser "Redeploy" → "Clear build cache and redeploy"

## Tests rapides (en ligne)
- Saisons (public):
  - `GET /api/seasons-public`
  - `GET /api/seasons` (doit répondre 200 si la version public est déployée)
- Admin (token requis):
  - `GET /api/get-orders-admin` avec en-tête `x-admin-token: <ADMIN_TOKEN>`
- Utilisateurs:
  - `POST /api/save-user` (JSON: name, email, phone, address, password)
  - `POST /api/verify-user` (JSON: email, password)

## Commandes cURL utiles
```sh
# Saisons (public)
curl -s https://<project>.vercel.app/api/seasons-public | head -c 400

# Commandes admin (avec token)
curl -s -H "x-admin-token: $ADMIN_TOKEN" https://<project>.vercel.app/api/get-orders-admin | head -c 400

# Vérifier un utilisateur
curl -s -X POST https://<project>.vercel.app/api/verify-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}' | head -c 400
```

## Notes
- Les endpoints d’écriture (save/update/delete/seasons POST/PUT/DELETE) exigent `x-admin-token`.
- `order.html` charge les saisons via l’endpoint public.
- Firestore: collections `users`, `orders`, `seasons`.
