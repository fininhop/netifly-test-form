document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  const nameInput = document.getElementById('profileName');
  const phoneInput = document.getElementById('profilePhone');
  const emailInput = document.getElementById('profileEmail');
  const deleteBtn = document.getElementById('deleteAccountBtn');

  // Assume user info in localStorage for now
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user) {
    nameInput.value = user.name || '';
    phoneInput.value = user.phone || '';
    emailInput.value = user.email || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      userId: user.id,
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim()
    };
    try {
      const resp = await fetch('/api/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const jr = await resp.json().catch(() => null);
      if (resp.ok) {
        localStorage.setItem('user', JSON.stringify({ ...user, name: payload.name, phone: payload.phone }));
        alert('Profil mis à jour');
      } else {
        alert(jr && jr.message ? jr.message : 'Erreur mise à jour profil');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Confirmez la suppression de votre compte ?')) return;
    try {
      const resp = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const jr = await resp.json().catch(() => null);
      if (resp.ok) {
        localStorage.removeItem('user');
        alert('Compte supprimé');
        window.location.href = '/index.html';
      } else {
        alert(jr && jr.message ? jr.message : 'Erreur suppression compte');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  });
});