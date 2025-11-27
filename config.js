const firebaseConfig = {
    apiKey: 'VOTRE_NEXT_PUBLIC_FIREBASE_API_KEY_ICI',
    authDomain: 'VOTRE_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_ICI',
    projectId: 'VOTRE_NEXT_PUBLIC_FIREBASE_PROJECT_ID_ICI',
    appId: 'VOTRE_NEXT_PUBLIC_FIREBASE_APP_ID_ICI'
};

// Prix unitaires par nom d'article (modifiable)
window.NAME_PRICES = window.NAME_PRICES || {
    "Pain 1kg": 4.50,
    "Pain 500g": 2.50,
    "Baguette": 1.20
};

// Poids unitaires par nom d'article en kg (optionnel)
window.NAME_WEIGHTS = window.NAME_WEIGHTS || {
    "Pain 1kg": 1.0,
    "Pain 500g": 0.5,
    "Baguette": 0.250
};
