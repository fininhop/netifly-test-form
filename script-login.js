// script-login.js - Connexion avec email et mot de passe

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) return 'Email invalide';
    return null;
}

function validatePassword(password) {
    if (!password || password.length < 8) return 'Mot de passe invalide';
    return null;
}

function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById(errorId);
    if (message) {
        input.classList.add('is-invalid');
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    } else {
        input.classList.remove('is-invalid');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const msg = document.getElementById('loginMessage');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    // Validation en temps réel
    emailInput.addEventListener('blur', () => {
        const error = validateEmail(emailInput.value);
        showError('loginEmail', 'emailError', error);
    });

    passwordInput.addEventListener('blur', () => {
        const error = validatePassword(passwordInput.value);
        showError('loginPassword', 'passwordError', error);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        // Validation
        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password);

        showError('loginEmail', 'emailError', emailErr);
        showError('loginPassword', 'passwordError', passwordErr);

        if (emailErr || passwordErr) {
            return;
        }

        try {
            // Appeler l'API pour vérifier les credentials
            const response = await fetch('/api/verify-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            let result = null;
            try {
                result = await response.json();
            } catch (parseErr) {
                const text = await response.text().catch(() => '');
                try { result = JSON.parse(text); } catch { result = { message: text || 'Réponse serveur invalide' }; }
            }

            if (response.ok && result && result.user) {
                // Stocker l'utilisateur connecté
                localStorage.setItem('currentUser', JSON.stringify({
                    userId: result.userId,
                    name: result.user.name,
                    email: result.user.email,
                    phone: result.user.phone || '',
                    address: result.user.address || ''
                }));

                msg.innerHTML = '<div class="alert alert-success">Connecté ! Redirection…</div>';
                setTimeout(() => { window.location.href = 'order.html'; }, 900);
            } else {
                if (response.status >= 500) {
                    msg.innerHTML = '<div class="alert alert-danger">Erreur serveur, réessayez plus tard.</div>';
                } else {
                    msg.innerHTML = '<div class="alert alert-danger">' + (result && result.message ? result.message : 'Email ou mot de passe incorrect') + '</div>';
                }
            }

        } catch (err) {
            console.error('Erreur login:', err);
            msg.innerHTML = '<div class="alert alert-danger">Erreur réseau. Réessayez.</div>';
        }
    });
});
