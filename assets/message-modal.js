// message-modal.js - Modal de feedback global (succès / erreur / info)
(function(){
  function ensureModal(){
    return document.getElementById('messageModal');
  }
  window.showMessageModal = function(title, message, type){
    var el = ensureModal();
    if(!el || !window.bootstrap){
      // Fallback minimal si bootstrap absent: éviter alert() (pas de modal native souhaitée)
      console.warn('Modal bootstrap indisponible:', title, message);
      return;
    }
    var titleEl = document.getElementById('messageModalTitle');
    var bodyEl = document.getElementById('messageModalBody');
    if(titleEl) titleEl.textContent = title || 'Message';
    if(bodyEl) bodyEl.innerHTML = message || '';
    var header = el.querySelector('.modal-header');
    if(header){
      header.classList.remove('bg-success','bg-danger','bg-warning','bg-info','text-white');
      if(type === 'success') header.classList.add('bg-success','text-white');
      else if(type === 'error' || type === 'danger') header.classList.add('bg-danger','text-white');
      else if(type === 'warning') header.classList.add('bg-warning');
      else header.classList.add('bg-info','text-white');
    }
    var modal = new bootstrap.Modal(el);
    modal.show();
  };
  const confirmEl = document.getElementById('confirmModal');
  const confirmYesBtn = document.getElementById('confirmModalYes');
  let currentResolve = null;
  if (confirmEl && window.bootstrap) {
    const confirmModal = new bootstrap.Modal(confirmEl);
    window.showConfirmModal = function(message){
      return new Promise((resolve)=>{
        currentResolve = resolve;
        document.getElementById('confirmModalBody').textContent = message || 'Confirmer ?';
        confirmModal.show();
      });
    };
    if (confirmYesBtn) {
      confirmYesBtn.addEventListener('click', ()=>{
        if (currentResolve) currentResolve(true);
        currentResolve = null;
        confirmModal.hide();
      });
    }
    confirmEl.addEventListener('hidden.bs.modal', ()=>{
      if (currentResolve) currentResolve(false);
      currentResolve = null;
    });
  }
})();
