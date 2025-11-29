(function(){
  const THEME_KEY = 'theme';
  const root = document.documentElement;
  function applyTheme(theme){
    if (theme === 'dark') root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
    updateToggle(theme);
  }
  function currentTheme(){
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Prefer system if not saved
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  function toggleTheme(){
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }
  function updateToggle(theme){
    document.querySelectorAll('#themeToggle').forEach(btn => {
      const isDark = theme === 'dark';
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', isDark ? 'Basculer en thème clair' : 'Basculer en thème sombre');
      if (!btn.dataset.bound){
        btn.addEventListener('click', toggleTheme);
        btn.dataset.bound = '1';
      }
    });
  }
  document.addEventListener('DOMContentLoaded', function(){
    applyTheme(currentTheme());
    // Update on system change if user never saved
    if (!localStorage.getItem(THEME_KEY) && window.matchMedia){
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => applyTheme(currentTheme()));
      } catch(e){}
    }
  });
})();
