// Global loader helpers
(function(){
  function $(id){ return document.getElementById(id); }
  window.showPageLoader = function(text){
    var overlay = $('pageLoader');
    if (!overlay){ return; }
    overlay.classList.remove('hidden');
    var textEl = $('pageLoaderText'); if (textEl && text){ textEl.textContent = text; }
  };
  window.hidePageLoader = function(){
    var overlay = $('pageLoader');
    if (!overlay){ return; }
    overlay.classList.add('hidden');
  };
  window.disableForm = function(form){
    try {
      Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea, button, a.btn'), function(el){
        if (el.tagName.toLowerCase() === 'a') { el.classList.add('disabled'); el.setAttribute('aria-disabled','true'); el.style.pointerEvents = 'none'; }
        else { el.disabled = true; }
      });
    } catch(e){}
  };
  window.enableForm = function(form){
    try {
      Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea, button, a.btn'), function(el){
        if (el.tagName.toLowerCase() === 'a') { el.classList.remove('disabled'); el.removeAttribute('aria-disabled'); el.style.pointerEvents = ''; }
        else { el.disabled = false; }
      });
    } catch(e){}
  };
  window.addEventListener('load', function(){ hidePageLoader(); });
  // Ensure loader never blocks modal interactions
  document.addEventListener('show.bs.modal', function(){ try{ hidePageLoader(); }catch(e){} });
})();
