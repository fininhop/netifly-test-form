(function(){
  if (window.bootstrap) return;
  function dispatch(el, name){ try { el.dispatchEvent(new CustomEvent(name, { bubbles: true })); } catch(_) {}
  }
  class Toast {
    constructor(el, opts){ this.el = el; this.delay = (opts && opts.delay) || 4000; this._t = null; }
    show(){
      this.el.classList.add('show');
      clearTimeout(this._t);
      this._t = setTimeout(()=>{ this.el.classList.remove('show'); }, this.delay);
    }
  }
  class Modal {
    constructor(el){ this.el = el; }
    show(){
      this.el.style.display = 'block';
      this.el.removeAttribute('aria-hidden');
      this.el.classList.add('show');
      document.body.classList.add('modal-open');
      dispatch(this.el, 'shown.bs.modal');
    }
    hide(){
      dispatch(this.el, 'hide.bs.modal');
      this.el.classList.remove('show');
      this.el.style.display = 'none';
      this.el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      dispatch(this.el, 'hidden.bs.modal');
    }
    static getOrCreateInstance(el){ return new Modal(el); }
  }
  class Collapse {
    constructor(el){ this.el = el; }
    show(){ this.el.classList.add('show'); dispatch(this.el, 'show.bs.collapse'); }
    hide(){ this.el.classList.remove('show'); dispatch(this.el, 'hide.bs.collapse'); }
    static getOrCreateInstance(el){ return new Collapse(el); }
  }
  class Tooltip { constructor(){} }
  window.bootstrap = { Toast, Modal, Collapse, Tooltip };
})();
