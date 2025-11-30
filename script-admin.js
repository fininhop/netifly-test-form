    console.log('Entrée dans loadDeliveryPoints');
// script-admin.js - Interface d'administration simple (token-based)

// Toast notification function
function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white');
    
    if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'error' || type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning');
    } else {
        toastHeader.classList.add('bg-info', 'text-white');
    }
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

document.addEventListener('DOMContentLoaded', () => {
    const adminLogin = document.getElementById('adminLogin');
    const adminArea = document.getElementById('adminArea');
    const adminForm = document.getElementById('adminLoginForm');
    const tokenInput = document.getElementById('adminTokenInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const ordersContainer = document.getElementById('ordersContainer');
    const adminMessage = document.getElementById('adminMessage');
    const logoutAdmin = document.getElementById('logoutAdmin');
    const sortSelect = document.getElementById('sortSelect');
    // Repositionner la section Produits après Saisons
    try {
        const prodItem = document.getElementById('headingProducts')?.closest('.accordion-item');
        const seasonsItem = document.getElementById('headingSeasons')?.closest('.accordion-item');
        if (prodItem && seasonsItem && seasonsItem.parentNode) {
            seasonsItem.after(prodItem);
        }
    } catch(e) { /* noop */ }
    
        // Produits: chargement et CRUD
        let PRODUCTS_FP = '';
        let ORDERS_FP = '';
        let SEASONS_FP = '';
        let USERS_FP = '';
        let AUTO_REFRESH_HANDLE = null;

        function computeFingerprint(list, pick) {
            try {
                const minimal = (list||[]).map(pick).sort((a,b)=> String(a.id||'').localeCompare(String(b.id||'')));
                return JSON.stringify(minimal);
            } catch(e){ return ''; }
        }
        let currentProducts = [];
        async function loadProducts() {
            const grid = document.getElementById('productsGrid');
            if (grid) {
                grid.innerHTML = '<div class="d-flex justify-content-center py-4 w-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement…</span></div></div>';
            }
            const resp = await fetch('/api/products');
            const data = await parseApiResponse(resp);
            if (!data.ok) return;
            currentProducts = data.products || [];
            PRODUCTS_FP = computeFingerprint(currentProducts, p => ({ id: String(p.id||''), cat: String(p.category||''), so: Number(p.sortOrder||0), name: String(p.name||''), act: p.active!==false }));
            if (!grid) return;
            grid.innerHTML = '';
            // Group products by category for admin view and render as accordion
            function slugify(s){ return String(s||'autres').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,''); }
            const byCat = new Map();
            currentProducts.forEach(p => {
                const catName = (p.category || 'Autres').trim() || 'Autres';
                if (!byCat.has(catName)) byCat.set(catName, []);
                byCat.get(catName).push(p);
            });

            const accId = 'adminProductsAccordion';
            const accordion = document.createElement('div');
            accordion.className = 'accordion';
            accordion.id = accId;

            const sortedCats = Array.from(byCat.entries()).sort((a,b)=> String(a[0]).localeCompare(String(b[0])));
            sortedCats.forEach(([catName, list], idxCat) => {
                list.sort((a,b)=>{
                    const sa = (typeof a.sortOrder==='number')?a.sortOrder:0;
                    const sb = (typeof b.sortOrder==='number')?b.sortOrder:0;
                    if (sa !== sb) return sa - sb;
                    return String(a.name||'').localeCompare(String(b.name||''));
                });
                const slug = slugify(catName) + '-' + idxCat;
                const headingId = `admin-head-${slug}`;
                const collapseId = `admin-collapse-${slug}`;
                const item = document.createElement('div');
                item.className = 'accordion-item border rounded-3 shadow-sm bg-white';
                item.innerHTML = `
                    <h2 class="accordion-header" id="${headingId}">
                        <button class="accordion-button ${idxCat>0 ? 'collapsed' : ''} bg-light fw-semibold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${idxCat===0}" aria-controls="${collapseId}">
                            ${catName}
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse ${idxCat===0 ? 'show' : ''}" aria-labelledby="${headingId}" data-bs-parent="#${accId}">
                        <div class="accordion-body py-3">
                            <div class="row g-3"></div>
                        </div>
                    </div>`;
                const row = item.querySelector('.row');
                list.forEach(p => {
                    const col = document.createElement('div');
                    col.className = 'col-12 col-md-6';
                    const card = document.createElement('div');
                    card.className = 'card h-100 shadow-sm';
                    const body = document.createElement('div');
                    body.className = 'card-body';
                    const nameEl = document.createElement('h6');
                    nameEl.className = 'card-title fw-bold text-primary mb-2';
                    nameEl.textContent = String(p.name || '');
                    const priceEl = document.createElement('p');
                    priceEl.className = 'card-text text-success fw-semibold fs-6 mb-1';
                    priceEl.textContent = '€ ' + Number(p.price).toFixed(2);
                    const weightEl = document.createElement('p');
                    weightEl.className = 'text-muted small mb-2';
                    weightEl.textContent = Number(p.unitWeight).toFixed(3) + ' kg / unité';
                    const metaRow = document.createElement('div');
                    metaRow.className = 'd-flex align-items-center justify-content-between mb-2';
                    const catBadge = document.createElement('span');
                    const cat = (p.category || '').trim();
                    if (cat) { catBadge.className = 'badge bg-primary-subtle text-primary-emphasis'; catBadge.textContent = cat; }
                    else { catBadge.className = 'badge bg-light text-muted'; catBadge.textContent = '—'; }
                    const orderBadge = document.createElement('span');
                    const so = (typeof p.sortOrder === 'number') ? p.sortOrder : 0;
                    orderBadge.className = 'badge bg-secondary-subtle text-secondary-emphasis';
                    orderBadge.textContent = '#' + so;
                    metaRow.appendChild(catBadge);
                    metaRow.appendChild(orderBadge);
                    const statusRow = document.createElement('div');
                    const activeBadge = document.createElement('span');
                    activeBadge.className = 'badge ' + (p.active ? 'bg-success' : 'bg-secondary');
                    activeBadge.textContent = p.active ? 'Actif' : 'Inactif';
                    statusRow.appendChild(activeBadge);
                    const actions = document.createElement('div');
                    actions.className = 'd-flex justify-content-end gap-2 mt-2';
                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-sm btn-outline-primary';
                    btnEdit.setAttribute('data-action', 'edit');
                    btnEdit.setAttribute('data-id', String(p.id));
                    btnEdit.textContent = 'Éditer';
                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'btn btn-sm btn-outline-danger';
                    btnDelete.setAttribute('data-action', 'delete');
                    btnDelete.setAttribute('data-id', String(p.id));
                    btnDelete.textContent = 'Supprimer';
                    body.appendChild(nameEl);
                    body.appendChild(priceEl);
                    body.appendChild(weightEl);
                    body.appendChild(metaRow);
                    body.appendChild(statusRow);
                    actions.appendChild(btnEdit);
                    actions.appendChild(btnDelete);
                    body.appendChild(actions);
                    card.appendChild(body);
                    col.appendChild(card);
                    row.appendChild(col);
                });
                accordion.appendChild(item);
            });

            grid.appendChild(accordion);
            

            function rerenderCategoryRow(catName) {
                const accId = 'adminProductsAccordion';
                const headingButton = Array.from(document.querySelectorAll('#'+accId+' .accordion-button')).find(btn => btn.textContent.trim() === catName);
                if (!headingButton) return;
                const collapseId = headingButton.getAttribute('data-bs-target');
                const collapseEl = collapseId ? document.querySelector(collapseId) : null;
                if (!collapseEl) return;
                const row = collapseEl.querySelector('.row');
                if (!row) return;
                // Build sorted list for this category
                const list = currentProducts.filter(p => (p.category||'') === catName)
                    .sort((a,b)=>{
                        const sa = (typeof a.sortOrder==='number')?a.sortOrder:0;
                        const sb = (typeof b.sortOrder==='number')?b.sortOrder:0;
                        if (sa !== sb) return sa - sb;
                        return String(a.name||'').localeCompare(String(b.name||''));
                    });
                // Rebuild cards minimalistically
                row.innerHTML = '';
                list.forEach(p => {
                    const col = document.createElement('div');
                    col.className = 'col-12 col-md-6';
                    const card = document.createElement('div');
                    card.className = 'card h-100 shadow-sm';
                    const body = document.createElement('div');
                    body.className = 'card-body';
                    const nameEl = document.createElement('h6');
                    nameEl.className = 'card-title fw-bold text-primary mb-2';
                    nameEl.textContent = String(p.name || '');
                    const priceEl = document.createElement('p');
                    priceEl.className = 'card-text text-success fw-semibold fs-6 mb-1';
                    priceEl.textContent = '€ ' + Number(p.price).toFixed(2);
                    const weightEl = document.createElement('p');
                    weightEl.className = 'text-muted small mb-2';
                    weightEl.textContent = Number(p.unitWeight).toFixed(3) + ' kg / unité';
                    const metaRow = document.createElement('div');
                    metaRow.className = 'd-flex align-items-center justify-content-between mb-2';
                    const catBadge = document.createElement('span');
                    const cat = (p.category || '').trim();
                    if (cat) { catBadge.className = 'badge bg-primary-subtle text-primary-emphasis'; catBadge.textContent = cat; }
                    else { catBadge.className = 'badge bg-light text-muted'; catBadge.textContent = '—'; }
                    const orderBadge = document.createElement('span');
                    const so = (typeof p.sortOrder === 'number') ? p.sortOrder : 0;
                    orderBadge.className = 'badge bg-secondary-subtle text-secondary-emphasis';
                    orderBadge.textContent = '#' + so;
                    metaRow.appendChild(catBadge);
                    metaRow.appendChild(orderBadge);
                    const statusRow = document.createElement('div');
                    const activeBadge = document.createElement('span');
                    activeBadge.className = 'badge ' + (p.active ? 'bg-success' : 'bg-secondary');
                    activeBadge.textContent = p.active ? 'Actif' : 'Inactif';
                    statusRow.appendChild(activeBadge);
                    const actions = document.createElement('div');
                    actions.className = 'd-flex justify-content-end gap-2 mt-2';
                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-sm btn-outline-primary';
                    btnEdit.setAttribute('data-action', 'edit');
                    btnEdit.setAttribute('data-id', String(p.id));
                    btnEdit.textContent = 'Éditer';
                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'btn btn-sm btn-outline-danger';
                    btnDelete.setAttribute('data-action', 'delete');
                    btnDelete.setAttribute('data-id', String(p.id));
                    btnDelete.textContent = 'Supprimer';
                    body.appendChild(nameEl);
                    body.appendChild(priceEl);
                    body.appendChild(weightEl);
                    body.appendChild(metaRow);
                    body.appendChild(statusRow);
                    actions.appendChild(btnEdit);
                    actions.appendChild(btnDelete);
                    body.appendChild(actions);
                    card.appendChild(body);
                    col.appendChild(card);
                    row.appendChild(col);
                });
                // rebind actions in this category row only
                row.querySelectorAll('button[data-action]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        const action = e.currentTarget.getAttribute('data-action');
                        const prod = currentProducts.find(x => x.id === id);
                        const token = localStorage.getItem('adminToken');
                        if (action === 'delete') {
                            const okDelete = await (window.showConfirmModal ? window.showConfirmModal(`Supprimer le produit \"${prod?.name}\" ?`) : Promise.resolve(confirm(`Supprimer le produit \"${prod?.name}\" ?`)));
                            if (!okDelete) return;
                            const r = await fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
                            const j = await r.json();
                            if (j.ok) { showToast('Produit supprimé', 'Succès'); loadProducts(); }
                            else showToast(j.error || 'Erreur', 'Erreur');
                        }
                        if (action === 'edit') {
                            openProductModal(prod);
                        }
                        
                    });
                });
            }

            grid.querySelectorAll('button[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const action = e.currentTarget.getAttribute('data-action');
                    const prod = currentProducts.find(x => x.id === id);
                    const token = localStorage.getItem('adminToken');
                    if (action === 'delete') {
                        const okDelete = await (window.showConfirmModal ? window.showConfirmModal(`Supprimer le produit \"${prod?.name}\" ?`) : Promise.resolve(confirm(`Supprimer le produit \"${prod?.name}\" ?`)));
                        if (!okDelete) return;
                        const r = await fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
                        const j = await r.json();
                        if (j.ok) { showToast('Produit supprimé', 'Succès'); loadProducts(); }
                        else showToast(j.error || 'Erreur', 'Erreur');
                    }
                    if (action === 'edit') {
                        openProductModal(prod);
                    }
                    
                });
            });
        }

        async function pollProductsIfChanged() {
            const r = await fetch('/api/products', { cache: 'no-cache' });
            const j = await r.json().catch(()=>({}));
            if (!j.ok) return;
            const fp = computeFingerprint(j.products||[], p => ({ id: String(p.id||''), cat: String(p.category||''), so: Number(p.sortOrder||0), name: String(p.name||''), act: p.active!==false }));
            if (fp !== PRODUCTS_FP) {
                await loadProducts();
            }
        }

        async function loadCategories() {
            try {
                const listEl = document.getElementById('categoriesList');
                if (listEl) {
                    listEl.innerHTML = '<div class="d-flex justify-content-center py-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement…</span></div></div>';
                }
                const r = await fetch('/api/products?categories=1');
                const j = await r.json();
                if (!j.ok) return [];
                return j.categories || [];
            } catch(e){ return []; }
        }

        function renderCategoryOptions(selectEl, categories, selected) {
            if (!selectEl) return;
            selectEl.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Choisir une catégorie…';
            selectEl.appendChild(defaultOpt);
            categories.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||''))).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.name;
                if (selected && selected === c.name) opt.selected = true;
                selectEl.appendChild(opt);
            });
        }

        function wireProductCreateForm() {
            const form = document.getElementById('createProductForm');
            if (!form) return;
            const catSelect = document.getElementById('prodCategory');
            const addCatBtn = document.getElementById('addCategoryBtn');
            // initial categories load
            loadCategories().then(cats => renderCategoryOptions(catSelect, cats));
            if (addCatBtn) {
                addCatBtn.addEventListener('click', async ()=>{
                    const categoriesModalEl = document.getElementById('categoriesModal');
                    const categoriesModal = (categoriesModalEl && window.bootstrap && window.bootstrap.Modal) ? new bootstrap.Modal(categoriesModalEl) : null;
                    if (!categoriesModal) return;
                    // Load and render list
                    const cats = await loadCategories();
                    const listEl = document.getElementById('categoriesList');
                    const optionsHtml = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                    listEl.innerHTML = cats.map(c => {
                        const nonEmpty = (c.productCount || 0) > 0;
                        return `<div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <span>${c.name} ${nonEmpty?`<span class='badge bg-secondary ms-2'>${c.productCount} produit(s)</span>`:''}</span>
                                <button class="btn btn-sm btn-outline-danger" data-action="delete-cat" data-name="${c.name}">${nonEmpty?'Supprimer (vide)':'Supprimer'}</button>
                            </div>
                            ${nonEmpty ? `<div class="mt-2 d-flex gap-2 align-items-center">
                                <select class="form-select form-select-sm" data-role="move-target">
                                    <option value="">Choisir catégorie cible…</option>
                                    ${optionsHtml}
                                </select>
                                <button class="btn btn-sm btn-outline-primary" data-action="move-then-delete" data-name="${c.name}">Déplacer les produits puis supprimer</button>
                            </div>`:''}
                        </div>`;
                    }).join('');
                    categoriesModal.show();
                });
            }
            // wire categories modal actions
            const createCategoryBtn = document.getElementById('createCategoryBtn');
            if (createCategoryBtn) {
                createCategoryBtn.addEventListener('click', async ()=>{
                    const name = document.getElementById('newCategoryName').value.trim();
                    if (!name) return showToast('Nom requis', 'Entrez un nom de catégorie', 'warning');
                    const token = localStorage.getItem('adminToken');
                    const r = await fetch('/api/products?category=1', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-admin-token': token }, body: JSON.stringify({ name }) });
                    const j = await r.json();
                    if (j.ok) {
                        showToast('Catégorie', 'Ajoutée', 'success');
                        document.getElementById('newCategoryName').value = '';
                        const cats = await loadCategories();
                        renderCategoryOptions(catSelect, cats);
                        const listEl = document.getElementById('categoriesList');
                        const optionsHtml = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                        listEl.innerHTML = cats.map(c => {
                            const nonEmpty = (c.productCount || 0) > 0;
                            return `<div class="list-group-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>${c.name} ${nonEmpty?`<span class='badge bg-secondary ms-2'>${c.productCount} produit(s)</span>`:''}</span>
                                    <button class="btn btn-sm btn-outline-danger" data-action="delete-cat" data-name="${c.name}">${nonEmpty?'Supprimer (vide)':'Supprimer'}</button>
                                </div>
                                ${nonEmpty ? `<div class="mt-2 d-flex gap-2 align-items-center">
                                    <select class="form-select form-select-sm" data-role="move-target">
                                        <option value="">Choisir catégorie cible…</option>
                                        ${optionsHtml}
                                    </select>
                                    <button class="btn btn-sm btn-outline-primary" data-action="move-then-delete" data-name="${c.name}">Déplacer les produits puis supprimer</button>
                                </div>`:''}
                            </div>`;
                        }).join('');
                    } else showToast('Erreur', j.error || 'Échec ajout catégorie', 'error');
                });
            }
            const categoriesList = document.getElementById('categoriesList');
            if (categoriesList) {
                categoriesList.addEventListener('click', async (e)=>{
                    const moveBtn = e.target.closest('button[data-action="move-then-delete"]');
                    const deleteBtn = e.target.closest('button[data-action="delete-cat"]');
                    const token = localStorage.getItem('adminToken');
                    if (moveBtn) {
                        const source = moveBtn.getAttribute('data-name');
                        const container = moveBtn.closest('.list-group-item');
                        const targetSelect = container && container.querySelector('select[data-role="move-target"]');
                        const target = targetSelect ? targetSelect.value : '';
                        if (!target) { showToast('Cible requise', 'Choisissez une catégorie cible', 'warning'); return; }
                        if (target === source) { showToast('Cible invalide', 'Choisissez une autre catégorie', 'warning'); return; }
                        // Charger tous les produits, déplacer ceux de la catégorie source
                        try {
                            const resp = await fetch('/api/products');
                            const data = await parseApiResponse(resp);
                            if (!data.ok) throw new Error('Produits non chargés');
                            const allProducts = data.products || [];
                            const prods = allProducts.filter(p => (p.category||'') === source)
                                .sort((a,b)=>{
                                    const sa = Number(a.sortOrder)||0; const sb = Number(b.sortOrder)||0; return sa - sb;
                                });
                            let targetMax = 0;
                            allProducts.forEach(p => { if ((p.category||'') === target) { const so = Number(p.sortOrder)||0; if (so > targetMax) targetMax = so; } });
                            for (const p of prods) {
                                targetMax += 1;
                                await fetch('/api/products?id='+encodeURIComponent(p.id), {
                                    method:'PUT',
                                    headers:{ 'Content-Type':'application/json', 'x-admin-token': token },
                                    body: JSON.stringify({ category: target, sortOrder: targetMax })
                                });
                            }
                            // Puis supprimer la catégorie
                            const rd = await fetch('/api/products?category='+encodeURIComponent(source), { method:'DELETE', headers:{ 'x-admin-token': token } });
                            const jd = await rd.json();
                            if (jd.ok) {
                                showToast('Succès', 'Produits déplacés et catégorie supprimée', 'success');
                                const cats = await loadCategories();
                                renderCategoryOptions(catSelect, cats);
                                const optionsHtml = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                                categoriesList.innerHTML = cats.map(c => {
                                    const nonEmpty = (c.productCount || 0) > 0;
                                    return `<div class="list-group-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span>${c.name} ${nonEmpty?`<span class='badge bg-secondary ms-2'>${c.productCount} produit(s)</span>`:''}</span>
                                            <button class="btn btn-sm btn-outline-danger" data-action="delete-cat" data-name="${c.name}">${nonEmpty?'Supprimer (vide)':'Supprimer'}</button>
                                        </div>
                                        ${nonEmpty ? `<div class="mt-2 d-flex gap-2 align-items-center">
                                            <select class="form-select form-select-sm" data-role="move-target">
                                                <option value="">Choisir catégorie cible…</option>
                                                ${optionsHtml}
                                            </select>
                                            <button class="btn btn-sm btn-outline-primary" data-action="move-then-delete" data-name="${c.name}">Déplacer les produits puis supprimer</button>
                                        </div>`:''}
                                    </div>`;
                                }).join('');
                            } else {
                                showToast('Erreur', jd.error || 'Échec suppression catégorie après déplacement', 'error');
                            }
                        } catch(err) {
                            console.error(err);
                            showToast('Erreur réseau', 'Impossible de déplacer/supprimer', 'error');
                        }
                        return;
                    }
                    if (deleteBtn) {
                        const name = deleteBtn.getAttribute('data-name');
                        const r = await fetch('/api/products?category='+encodeURIComponent(name), { method:'DELETE', headers:{ 'x-admin-token': token } });
                        const j = await r.json();
                        if (j.ok) {
                            showToast('Catégorie', 'Supprimée', 'success');
                            const cats = await loadCategories();
                            renderCategoryOptions(catSelect, cats);
                            const optionsHtml = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                            categoriesList.innerHTML = cats.map(c => {
                                const nonEmpty = (c.productCount || 0) > 0;
                                return `<div class="list-group-item">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span>${c.name} ${nonEmpty?`<span class='badge bg-secondary ms-2'>${c.productCount} produit(s)</span>`:''}</span>
                                        <button class="btn btn-sm btn-outline-danger" data-action="delete-cat" data-name="${c.name}">${nonEmpty?'Supprimer (vide)':'Supprimer'}</button>
                                    </div>
                                    ${nonEmpty ? `<div class="mt-2 d-flex gap-2 align-items-center">
                                        <select class="form-select form-select-sm" data-role="move-target">
                                            <option value="">Choisir catégorie cible…</option>
                                            ${optionsHtml}
                                        </select>
                                        <button class="btn btn-sm btn-outline-primary" data-action="move-then-delete" data-name="${c.name}">Déplacer les produits puis supprimer</button>
                                    </div>`:''}
                                </div>`;
                            }).join('');
                        } else showToast('Erreur', j.error || 'Échec suppression catégorie', 'error');
                    }
                });
            }
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('prodName').value.trim();
                const price = Number(document.getElementById('prodPrice').value);
                const unitWeight = Number(document.getElementById('prodUnitWeight').value);
                const category = (document.getElementById('prodCategory')?.value || '').trim();
                const sortOrderRaw = document.getElementById('prodSortOrder')?.value;
                const sortOrder = parseInt(sortOrderRaw, 10);
                if (!name || Number.isNaN(price) || Number.isNaN(unitWeight)) {
                    return showMessageModal('Champs requis', 'Veuillez renseigner correctement les champs.', 'warning');
                }
                if (!category) {
                    return showMessageModal('Catégorie requise', 'Veuillez renseigner une catégorie pour le produit.', 'warning');
                }
                // Vérifier unicité de la position dans la catégorie lors de la création
                if (!Number.isNaN(sortOrder)) {
                    if (sortOrder < 1) {
                        return showMessageModal('Position invalide', 'La position doit être supérieure ou égale à 1.', 'warning');
                    }
                    const countInCat = currentProducts.filter(p => (p.category||'') === category).length;
                    if (sortOrder > countInCat + 1) {
                        return showMessageModal('Position invalide', `La position ne peut pas dépasser ${countInCat + 1}.`, 'warning');
                    }
                    const dup = currentProducts.some(p => (p.category||'') === category && typeof p.sortOrder === 'number' && p.sortOrder === sortOrder);
                    if (dup) {
                        return showMessageModal('Position déjà utilisée', 'Un autre produit dans cette catégorie a déjà cette position. Choisissez une autre valeur ou laissez vide pour placer en premier.', 'warning');
                    }
                }
                const token = localStorage.getItem('adminToken');
                const payload = { name, price, unitWeight, active: true, category };
                if (!Number.isNaN(sortOrder)) payload.sortOrder = sortOrder; // blank = server will set first
                const resp = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify(payload) });
                const j = await parseApiResponse(resp);
                if (j.ok) {
                    form.reset();
                    showToast('Produit ajouté', 'Succès');
                    loadProducts();
                    // refresh categories options
                    const cats = await loadCategories();
                    renderCategoryOptions(catSelect, cats);
                } else showToast(j.error || 'Erreur', 'Erreur');
            });
        }

        // Modal édition produit
        const productModalEl = document.getElementById('productModal');
        const productIdInput = document.getElementById('productId');
        const productNameInput = document.getElementById('productName');
        const productPriceInput = document.getElementById('productPrice');
        const productUnitWeightInput = document.getElementById('productUnitWeight');
        const productActiveInput = document.getElementById('productActive');
        const productCategoryInput = document.getElementById('productCategory');
        const addCategoryBtnEdit = document.getElementById('addCategoryBtnEdit');
        const productSortOrderInput = document.getElementById('productSortOrder');
        const saveProductBtn = document.getElementById('saveProductBtn');
        let productModal = null;
        if (productModalEl && window.bootstrap) {
            if (window.bootstrap && window.bootstrap.Modal) productModal = new bootstrap.Modal(productModalEl);
        }

        function openProductModal(prod) {
            if (!productModal && window.bootstrap && productModalEl) {
                if (window.bootstrap && window.bootstrap.Modal) productModal = new bootstrap.Modal(productModalEl);
            }
            if (!productModal) { showToast('Erreur', 'Le module modal n\'est pas chargé', 'error'); return; }
            // Load categories and set selection
            loadCategories().then(cats => {
                renderCategoryOptions(productCategoryInput, cats, prod && prod.category ? String(prod.category) : '');
            });
            productIdInput.value = prod && prod.id ? String(prod.id) : '';
            productNameInput.value = prod && prod.name ? String(prod.name) : '';
            productPriceInput.value = prod && typeof prod.price === 'number' ? String(prod.price) : '';
            productUnitWeightInput.value = prod && typeof prod.unitWeight === 'number' ? String(prod.unitWeight) : '';
            productActiveInput.checked = !!(prod && prod.active !== false);
            if (productSortOrderInput) productSortOrderInput.value = (prod && typeof prod.sortOrder === 'number') ? String(prod.sortOrder) : '';
            productModal.show();
        }

        if (addCategoryBtnEdit) {
            addCategoryBtnEdit.addEventListener('click', async ()=>{
                const categoriesModalEl = document.getElementById('categoriesModal');
                const categoriesModal = (categoriesModalEl && window.bootstrap && window.bootstrap.Modal) ? new bootstrap.Modal(categoriesModalEl) : null;
                if (!categoriesModal) return;
                const cats = await loadCategories();
                const listEl = document.getElementById('categoriesList');
                listEl.innerHTML = cats.map(c => `<div class="list-group-item d-flex justify-content-between align-items-center"><span>${c.name}</span><button class="btn btn-sm btn-outline-danger" data-action="delete-cat" data-name="${c.name}" ${c.productCount>0?'disabled title="Catégorie non vide"':''}>Supprimer</button></div>`).join('');
                categoriesModal.show();
            });
        }

        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', async () => {
                const id = productIdInput.value.trim();
                const name = productNameInput.value.trim();
                const price = Number(productPriceInput.value);
                const unitWeight = Number(productUnitWeightInput.value);
                const active = !!productActiveInput.checked;
                const category = (productCategoryInput?.value || '').trim();
                const sortOrderRaw = productSortOrderInput?.value;
                let sortOrder = parseInt(sortOrderRaw, 10);
                if (!name || Number.isNaN(price) || Number.isNaN(unitWeight)) {
                    showToast('Champs requis', 'Vérifiez nom, prix et poids', 'warning');
                    return;
                }
                if (!category) {
                    showToast('Catégorie requise', 'Veuillez renseigner une catégorie pour le produit', 'warning');
                    return;
                }
                // Vérifier position et gérer cas de changement de catégorie
                const currentProd = currentProducts.find(p => p.id === id);
                const isSameCategory = currentProd && ((currentProd.category||'') === category);
                const inTargetCat = currentProducts.filter(p => (p.category||'') === category);
                let maxOrder = 0; inTargetCat.forEach(p => { const so = Number(p.sortOrder); if (Number.isFinite(so) && so > maxOrder) maxOrder = so; });
                // Si aucune position fournie ET on change de catégorie, placer en fin automatiquement
                if (Number.isNaN(sortOrder) && !isSameCategory) {
                    sortOrder = maxOrder + 1;
                }
                if (!Number.isNaN(sortOrder)) {
                    if (sortOrder < 1) { showToast('Position invalide', 'La position doit être supérieure ou égale à 1.', 'warning'); return; }
                    const countInCat = inTargetCat.length;
                    const maxAllowed = isSameCategory ? countInCat : (countInCat + 1);
                    if (sortOrder > maxAllowed) {
                        showToast('Position invalide', `La position ne peut pas dépasser ${maxAllowed}.`, 'warning');
                        return;
                    }
                    const dupProd = currentProducts.find(p => p.id !== id && (p.category||'') === category && typeof p.sortOrder === 'number' && p.sortOrder === sortOrder);
                    if (dupProd && isSameCategory) {
                        const token = localStorage.getItem('adminToken');
                        const headers = { 'Content-Type': 'application/json', 'x-admin-token': token };
                        try {
                            // Mettre à jour d'abord les autres champs du produit courant (sans toucher à l'ordre)
                            const nonOrderPayload = { name, price, unitWeight, active, category };
                            await fetch('/api/products?id=' + encodeURIComponent(id), { method: 'PUT', headers, body: JSON.stringify(nonOrderPayload) });

                            // Calcul d'une valeur temporaire unique pour éviter l'unicité côté serveur
                            const tempOrder = maxOrder + 1;

                            const oldOrder = Number(currentProd.sortOrder) || 0;
                            // Étape 1: déplacer le produit courant vers tempOrder
                            let r = await fetch('/api/products?id='+encodeURIComponent(id), { method:'PUT', headers, body: JSON.stringify({ sortOrder: tempOrder }) });
                            let j = await r.json().catch(()=>({}));
                            if (!r.ok || !j.ok) throw new Error('Échec étape 1');
                            // Étape 2: donner l'ancien ordre du produit courant au produit en conflit
                            r = await fetch('/api/products?id='+encodeURIComponent(dupProd.id), { method:'PUT', headers, body: JSON.stringify({ sortOrder: oldOrder }) });
                            j = await r.json().catch(()=>({}));
                            if (!r.ok || !j.ok) throw new Error('Échec étape 2');
                            // Étape 3: donner l'ordre souhaité au produit courant
                            r = await fetch('/api/products?id='+encodeURIComponent(id), { method:'PUT', headers, body: JSON.stringify({ sortOrder }) });
                            j = await r.json().catch(()=>({}));
                            if (!r.ok || !j.ok) throw new Error('Échec étape 3');

                            showToast('Succès', 'Position échangée avec succès', 'success');
                            if (productModal) productModal.hide();
                            loadProducts();
                            return;
                        } catch (err) {
                            console.error('Erreur swap position:', err);
                            showToast('Erreur', 'Impossible d\'échanger les positions. Réessayez.', 'error');
                            return;
                        }
                    } else if (dupProd && !isSameCategory) {
                        // Si on déplace vers une autre catégorie et que la position demandée est déjà prise,
                        // on place automatiquement en fin pour éviter le conflit.
                        sortOrder = maxOrder + 1;
                    }
                }
                const token = localStorage.getItem('adminToken');
                try {
                    const payload = { name, price, unitWeight, active, category };
                    if (!Number.isNaN(sortOrder)) payload.sortOrder = sortOrder; // défini ci-dessus pour nouveaux cas
                    const resp = await fetch('/api/products?id=' + encodeURIComponent(id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify(payload)
                    });
                    const j = await parseApiResponse(resp);
                    if (resp.ok && j && j.ok) {
                        showToast('Succès', 'Produit mis à jour', 'success');
                        if (productModal) productModal.hide();
                        loadProducts();
                    } else {
                        showToast('Erreur', (j && j.error) ? j.error : 'Échec de mise à jour', 'error');
                    }
                } catch (err) {
                    console.error('Erreur update produit:', err);
                    showToast('Erreur réseau', 'Réessayez', 'error');
                }
            });
        }

        wireProductCreateForm();
        loadProducts();

    // Éléments pour la gestion des saisons
    const seasonsContainer = document.getElementById('seasonsContainer');
    const seasonFilter = document.getElementById('seasonFilter');
    const newSeasonBtn = document.getElementById('newSeasonBtn');
    const seasonModalEl = document.getElementById('seasonModal');
    const seasonModal = (seasonModalEl && window.bootstrap && window.bootstrap.Modal) ? new bootstrap.Modal(seasonModalEl) : null;
    const saveSeasonBtn = document.getElementById('saveSeasonBtn');
    const seasonForm = document.getElementById('seasonForm');
    const seasonIdInput = document.getElementById('seasonId');
    const seasonNameInput = document.getElementById('seasonName');
    const seasonStartInput = document.getElementById('seasonStart');
    const seasonEndInput = document.getElementById('seasonEnd');
    const seasonDescInput = document.getElementById('seasonDescription');

    // Fonction utilitaire: ouvrir le modal (création ou édition de saison)
    function openSeasonModal(season) {
        if (!seasonModal) return;
        if (season) {
            seasonIdInput.value = season.id || '';
            seasonNameInput.value = season.name || '';
            seasonStartInput.value = season.startDate || '';
            seasonEndInput.value = season.endDate || '';
            seasonDescInput.value = season.description || '';
            if (saveSeasonBtn) saveSeasonBtn.textContent = 'Mettre à jour';
        } else {
            seasonIdInput.value = '';
            seasonNameInput.value = '';
            seasonStartInput.value = '';
            seasonEndInput.value = '';
            seasonDescInput.value = '';
            if (saveSeasonBtn) saveSeasonBtn.textContent = 'Créer';
        }
        seasonModal.show();
    }

    // Utilisateurs (Administrer utilisateurs)
    const adminUsersList = document.getElementById('adminUsersList');
    const adminUserSearchQuery = document.getElementById('adminUserSearchQuery');
    const adminUsersReload = document.getElementById('adminUsersReload');
    let allUsers = [];

    function showMessage(text, type='') {
        adminMessage.innerHTML = text ? `<div class="text-${type}">${text}</div>` : '';
    }

    // Gestionnaire de tri
    sortSelect.addEventListener('change', () => {
        currentSortBy = sortSelect.value;
        if (currentOrders.length > 0) {
            applyOrdersView();
        }
    });

    // Utiliser le mapping global centralisé défini dans config.js
    const NAME_PRICES = window.NAME_PRICES || {};
    const NAME_WEIGHTS = window.NAME_WEIGHTS || {};
    function normalizeKey(s){ return String(s||'').trim().toLowerCase(); }
    function resolveMap(map, key){
        const nk = normalizeKey(key);
        if (nk in map) return map[nk];
        for (const k of Object.keys(map)) { if (normalizeKey(k) === nk) return map[k]; }
        return undefined;
    }

    function computeOrderTotal(order) {
        const items = order.items || [];
        return items.reduce((sum, it) => {
            const priceFromMap = resolveMap(window.NAME_PRICES || {}, it.name);
            const unit = (typeof it.price === 'number') ? it.price : (priceFromMap !== undefined ? priceFromMap : 0);
            const qty = Number(it.quantity) || 0;
            return sum + unit * qty;
        }, 0);
    }

    const seasonStatsEl = document.getElementById('seasonStats');
    const seasonOrderCountEl = document.getElementById('seasonOrderCount');
    const seasonTotalPriceEl = document.getElementById('seasonTotalPrice');
    const seasonAveragePriceEl = document.getElementById('seasonAveragePrice');
    const seasonTotalWeightEl = document.getElementById('seasonTotalWeight');
    const allSeasonsStatsEl = document.getElementById('allSeasonsStats');
    const allSeasonsStatsBodyTbody = (function(){
        const el = document.querySelector('#allSeasonsStatsBody tbody');
        return el;
    })();
    const allSeasonsTotalCountEl = document.getElementById('allSeasonsTotalCount');
    const allSeasonsTotalPriceEl = document.getElementById('allSeasonsTotalPrice');
    const allSeasonsAvgPriceEl = document.getElementById('allSeasonsAvgPrice');

    function updateSeasonStats(ordersForView) {
        if (!seasonStatsEl) return;
        const hasSeason = currentSeasonFilter && currentSeasonFilter !== 'all';
        if (!hasSeason) {
            seasonStatsEl.style.display = 'none';
            return;
        }
        const count = ordersForView.length;
        const total = ordersForView.reduce((s, o) => s + computeOrderTotal(o), 0);
        const weightTotal = ordersForView.reduce((s, o) => {
            return s + (o.items||[]).reduce((sw,it)=>{
                const qty = Number(it.quantity)||0;
                const uw = Number(it.unitWeight)||0;
                return sw + qty * uw;
            },0);
        },0);
        const avg = count > 0 ? total / count : 0;
        seasonOrderCountEl.textContent = String(count);
        seasonTotalPriceEl.textContent = `€${total.toFixed(2)}`;
        seasonAveragePriceEl.textContent = `€${avg.toFixed(2)}`;
        if (seasonTotalWeightEl) seasonTotalWeightEl.textContent = weightTotal.toFixed(3);
        seasonStatsEl.style.display = 'block';
    }

    function applyOrdersView() {
        let list = [...currentOrders];
        if (currentSeasonFilter && currentSeasonFilter !== 'all') {
            list = list.filter(o => (o.seasonId || '') === currentSeasonFilter);
        }
        renderOrders(list, currentSortBy);
        updateSeasonStats(list);
        updateAllSeasonsStats(currentOrders);
    }

    function updateAllSeasonsStats(orders) {
        if (!allSeasonsStatsEl || !allSeasonsStatsBodyTbody) return;
        const showAll = currentSeasonFilter === 'all';
        allSeasonsStatsEl.style.display = showAll ? 'block' : 'none';
        if (!showAll) return;
        const bySeason = new Map();
        orders.forEach(o => {
            const key = o.seasonName || o.seasonId || '—';
            const total = computeOrderTotal(o);
            const entry = bySeason.get(key) || { count: 0, sum: 0 };
            entry.count += 1;
            entry.sum += total;
            bySeason.set(key, entry);
        });
        const rows = Array.from(bySeason.entries()).sort((a,b) => String(a[0]).localeCompare(String(b[0]))).map(([name, stats]) => {
            const avg = stats.count ? (stats.sum / stats.count) : 0;
            return `<tr><td>${name}</td><td>${stats.count}</td><td>€${stats.sum.toFixed(2)}</td><td>€${avg.toFixed(2)}</td></tr>`;
        }).join('');
        allSeasonsStatsBodyTbody.innerHTML = rows || '<tr><td colspan="4" class="text-muted">Aucune donnée</td></tr>';
        const totalCount = orders.length;
        const totalSum = orders.reduce((s,o)=> s + computeOrderTotal(o), 0);
        const totalAvg = totalCount ? (totalSum / totalCount) : 0;
        allSeasonsTotalCountEl.textContent = String(totalCount);
        allSeasonsTotalPriceEl.textContent = `€${totalSum.toFixed(2)}`;
        allSeasonsAvgPriceEl.textContent = `€${totalAvg.toFixed(2)}`;
    }

    function renderOrders(orders, sortBy = 'createdAt') {
        if (!orders || !orders.length) {
            ordersContainer.innerHTML = '<div class="alert alert-info text-center py-5"><h5>📭 Aucune commande trouvée</h5><p class="mb-0">Il n\'y a pas encore de commandes à afficher.</p></div>';
            return;
        }

        // Trier les commandes
        const sortedOrders = [...orders].sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'createdAt':
                    aVal = new Date(a.createdAt || 0);
                    bVal = new Date(b.createdAt || 0);
                    return bVal - aVal; // Plus récent en premier
                case 'date':
                    aVal = a.date || '';
                    bVal = b.date || '';
                    return aVal.localeCompare(bVal);
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    return aVal.localeCompare(bVal);
                // ancien case retiré
                case 'season':
                    aVal = (a.seasonName || a.seasonId || '').toLowerCase();
                    bVal = (b.seasonName || b.seasonId || '').toLowerCase();
                    return aVal.localeCompare(bVal);
                default:
                    return 0;
            }
        });
        // Séparer en cours / terminées selon la date de fin de la saison (fallback: date de retrait)
        const now = new Date();
        const ongoing = [];
        const finished = [];
        sortedOrders.forEach(o => {
            const season = currentSeasons.find(s => s.id === o.seasonId);
            let isFinished = false;
            if (season && season.endDate) {
                try { isFinished = new Date(season.endDate) < now; } catch(e) { isFinished = false; }
            } else if (o.date) {
                // fallback si saison manquante: considérer la date de retrait
                try { isFinished = new Date(o.date) < now; } catch(e) { isFinished = false; }
            }
            if (isFinished) finished.push(o); else ongoing.push(o);
        });

        function cardHtml(o){
            const items = (o.items || []).map(it => {
                const unit = (typeof it.price === 'number') ? it.price : (NAME_PRICES[it.name] || 0);
                const line = unit ? `€${(unit * (Number(it.quantity)||0)).toFixed(2)}` : '';
                return `<div class="item-row"><span>${it.quantity} × ${it.name}</span><span class="text-muted">${line}</span></div>`;
            }).join('');
            const orderTotal = computeOrderTotal(o);
            const dateCmd = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) : '—';
            const dateRetrait = o.date ? new Date(o.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
            }) : '—';
            return `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="order-card" data-order-id="${o.id}" data-order-date="${o.date || ''}">
                        <div class="order-header">
                            <h6 class="order-title">👤 ${o.name} ${o.seasonName ? `<span class='badge bg-info ms-1'>${o.seasonName}</span>` : ''}</h6>
                            <p class="order-date">📅 ${dateCmd} &nbsp; <strong>Total: €${orderTotal.toFixed(2)}</strong></p>
                        </div>
                        <div class="order-body">
                            <div class="order-info">
                                <div class="info-item">
                                    <span class="info-label">📧 Contact</span>
                                    <span class="info-value">${o.email}<br><small class="text-muted">${o.phone}</small></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">📍 Retrait</span>
                                    <span class="info-value">${dateRetrait}</span>
                                </div>
                            </div>
                            <div class="items-section">
                                <div class="items-title">🛒 Articles commandés</div>
                                ${items}
                            </div>
                            <div class="order-actions">
                                <button class="btn btn-sm btn-outline-secondary btn-edit">✏️ Éditer</button>
                                <button class="btn btn-sm btn-outline-danger btn-delete">🗑️ Supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        let html = '';
        if (ongoing.length) {
            html += `<div class="col-12"><h5 class="mb-3">🏗️ En cours</h5></div>` + ongoing.map(cardHtml).join('');
        }
        if (finished.length) {
            html += `<div class="col-12 mt-4"><h5 class="mb-3">✅ Terminées</h5></div>` + finished.map(cardHtml).join('');
        }
        ordersContainer.innerHTML = `<div class="row g-3">${html}</div>`;

        // Attacher écouteurs aux boutons
        ordersContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const clientName = card && card.querySelector('.order-title').textContent;
                if (!orderId) return;
                const okOrderDelete = await (window.showConfirmModal ? window.showConfirmModal(`Supprimer la commande de ${clientName} ?`) : Promise.resolve(confirm(`Supprimer la commande de ${clientName} ?`)));
                if (!okOrderDelete) return;
                const token = localStorage.getItem('adminToken');
                showPageLoader('Suppression…');
                try {
                    const resp = await fetch('/api/orders', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId })
                    });
                    const jr = await parseApiResponse(resp);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Commande supprimée', 'success');
                        card.remove();
                    } else {
                        showToast('❌ Erreur', 'Suppression échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur delete:', err);
                    showToast('❌ Erreur réseau', 'Impossible de supprimer la commande', 'error');
                } finally {
                    hidePageLoader();
                }
            });
        });

        // Modal-based edit
        const modalEl = document.getElementById('editModal');
        const modal = (modalEl && window.bootstrap && window.bootstrap.Modal) ? new bootstrap.Modal(modalEl) : null;
        const editOrderId = document.getElementById('editOrderId');
        const editDate = document.getElementById('editDate');
        const saveEditBtn = document.getElementById('saveEditBtn');

        ordersContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const date = card && card.getAttribute('data-order-date');
                if (!orderId || !modal) return;
                editOrderId.value = orderId;
                editDate.value = (date || '');
                modal.show();
            });
        });

        if (saveEditBtn && modal) {
            saveEditBtn.onclick = async () => {
                const orderId = editOrderId.value;
                const updates = {};
                if (editDate.value) updates.date = editDate.value;
                
                if (!orderId || Object.keys(updates).length === 0) { modal.hide(); return; }
                const token = localStorage.getItem('adminToken');
                showPageLoader('Mise à jour…');
                try {
                    const resp = await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId, updates })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Commande mise à jour', 'success');
                        modal.hide();
                        fetchAdminOrders(token);
                    } else {
                        showToast('❌ Erreur', 'Mise à jour échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur update:', err);
                    showToast('❌ Erreur réseau', 'Impossible de mettre à jour', 'error');
                } finally {
                    hidePageLoader();
                }
            };
        }
    }

    let currentOrders = [];
    let currentSortBy = 'createdAt';
    let currentSeasons = [];
    let currentSeasonFilter = 'all';
    const exportSeasonPdfBtn = document.getElementById('exportSeasonPdf');
    const exportSeasonCsvBtn = document.getElementById('exportSeasonCsv');

    // Fonctions de gestion des saisons
    async function fetchSeasons(token) {
        try {
            const response = await fetch('/api/seasons', { headers: { 'x-admin-token': token } });
            const result = await response.json();

            if (response.ok) {
                currentSeasons = result.seasons || [];
                renderSeasons(currentSeasons);
                updateSeasonFilter();
                return currentSeasons;
            } else {
                console.error('Erreur chargement saisons:', result.message);
                return [];
            }
        } catch (error) {
            console.error('Erreur réseau saisons:', error);
            return [];
        }
    }

    function renderSeasons(seasons) {
        if (!seasonsContainer) return;

        if (!seasons || seasons.length === 0) {
            seasonsContainer.innerHTML = '<div class="alert alert-info text-center py-3"><h6>📅 Aucune saison</h6><p class="mb-0">Créez votre première saison de commande.</p></div>';
            return;
        }

        let html = '';
        seasons.forEach(season => {
            const startDate = season.startDate ? new Date(season.startDate).toLocaleDateString('fr-FR') : '—';
            const endDate = season.endDate ? new Date(season.endDate).toLocaleDateString('fr-FR') : '—';
            const isActive = isSeasonActive(season);

            html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="season-card ${isActive ? 'active' : ''}" data-season-id="${season.id}">
                        <div class="season-header">
                            <h6 class="season-title">🌸 ${season.name}</h6>
                            <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div class="season-body">
                            <div class="season-dates">
                                <div class="date-item">
                                    <span class="date-label">Début:</span>
                                    <span class="date-value">${startDate}</span>
                                </div>
                                <div class="date-item">
                                    <span class="date-label">Fin:</span>
                                    <span class="date-value">${endDate}</span>
                                </div>
                            </div>
                            ${season.description ? `<div class="season-desc">${season.description}</div>` : ''}
                            <div class="season-actions">
                                <button class="btn btn-sm btn-outline-primary btn-edit-season">✏️ Éditer</button>
                                <button class="btn btn-sm btn-outline-danger btn-delete-season">🗑️ Supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        seasonsContainer.innerHTML = `<div class="row g-3">${html}</div>`;

        // Boutons Edit/Supprimer pour chaque saison
        seasonsContainer.querySelectorAll('.btn-edit-season').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.season-card');
                const id = card && card.getAttribute('data-season-id');
                if (!id) return;
                const s = currentSeasons.find(x => x.id === id);
                if (!s || !seasonModal) return;
                openSeasonModal(s);
            });
        });

        seasonsContainer.querySelectorAll('.btn-delete-season').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.season-card');
                const id = card && card.getAttribute('data-season-id');
                if (!id) return;
                const okSeasonDelete = await (window.showConfirmModal ? window.showConfirmModal('Supprimer cette saison ?') : Promise.resolve(confirm('Supprimer cette saison ?')));
                if (!okSeasonDelete) return;
                const token = localStorage.getItem('adminToken');
                try {
                    const resp = await fetch(`/api/seasons?seasonId=${encodeURIComponent(id)}` , {
                        method: 'DELETE',
                        headers: { 'x-admin-token': token }
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Saison supprimée', 'success');
                        // Retirer visuellement ou recharger
                        fetchSeasons(token);
                    } else {
                        showToast('❌ Erreur', 'Suppression échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur delete saison:', err);
                    showToast('❌ Erreur réseau', 'Impossible de supprimer la saison', 'error');
                }
            });
        });
    }

    function isSeasonActive(season) {
        const now = new Date();
        const start = new Date(season.startDate);
        const end = new Date(season.endDate);
        return now >= start && now <= end;
    }

    function updateSeasonFilter() {
        if (!seasonFilter) return;

        let options = '<option value="all">Toutes les saisons</option>';
        currentSeasons.forEach(season => {
            const isActive = isSeasonActive(season);
            options += `<option value="${season.id}" ${isActive ? 'selected' : ''}>${season.name} ${isActive ? '(Active)' : ''}</option>`;
        });

        seasonFilter.innerHTML = options;
        // Mettre à jour le filtre actuel si une saison active est auto-sélectionnée
        const selected = seasonFilter.value || 'all';
        currentSeasonFilter = selected;
        applyOrdersView();
    }

    async function fetchAdminOrders(token) {
        showMessage('Chargement...', 'muted');
        try {
            const response = await fetch('/api/orders', { headers: { 'x-admin-token': token } });
            let result = null;
            try { result = await response.json(); } catch(e) { result = null; }

            if (!response.ok) {
                showMessage('Erreur: ' + (result && result.message ? result.message : response.statusText), 'danger');
                return;
            }

            currentOrders = result.orders || [];
            ORDERS_FP = computeFingerprint(currentOrders, o => ({ id: String(o.id||''), ca: String(o.createdAt||''), d: String(o.date||''), n: String(o.name||''), len: (o.items||[]).length }));
            renderOrders(currentOrders, currentSortBy);
            showMessage('Chargé: ' + currentOrders.length + ' commandes', 'success');
        } catch (err) {
            console.error('Erreur admin fetch:', err);
            showMessage('Erreur réseau. Réessayez.', 'danger');
        }
    }

    // Si token existant en localStorage, tenter login automatique
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        fetchAdminOrders(storedToken);
        fetchSeasons(storedToken);
        fetchUsers();
        ensureAdminAutoRefresh();
    }

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = tokenInput.value.trim();
        if (!token) return;
        showPageLoader('Connexion administrateur…');
        disableForm(adminForm);
        localStorage.setItem('adminToken', token);
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        try {
            await Promise.all([fetchAdminOrders(token), fetchSeasons(token)]);
            await fetchUsers();
            ensureAdminAutoRefresh();
        } finally {
            enableForm(adminForm);
            hidePageLoader();
        }
    });

    refreshBtn.addEventListener('click', async () => {
        const t = localStorage.getItem('adminToken');
        if (!t) { showMessage('Token manquant', 'danger'); return; }
        showPageLoader('Actualisation des données…');
        try {
            await Promise.all([fetchAdminOrders(t), fetchSeasons(t)]);
            await fetchUsers();
        } finally {
            hidePageLoader();
        }
    });

    logoutAdmin.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        adminArea.classList.add('d-none');
        adminLogin.classList.remove('d-none');
        ordersContainer.innerHTML = '';
        showMessage('Déconnecté');
        if (AUTO_REFRESH_HANDLE) { clearInterval(AUTO_REFRESH_HANDLE); AUTO_REFRESH_HANDLE = null; }
    });

    async function pollOrdersIfChanged() {
        const t = localStorage.getItem('adminToken');
        if (!t) return;
        const r = await fetch('/api/orders', { headers: { 'x-admin-token': t }, cache: 'no-cache' });
        const j = await r.json().catch(()=>({}));
        if (!r.ok || !j || !j.orders) return;
        const fp = computeFingerprint(j.orders||[], o => ({ id: String(o.id||''), ca: String(o.createdAt||''), d: String(o.date||''), n: String(o.name||''), len: (o.items||[]).length }));
        if (fp !== ORDERS_FP) {
            await fetchAdminOrders(t);
        }
    }

    async function pollSeasonsIfChanged() {
        const t = localStorage.getItem('adminToken');
        if (!t) return;
        const r = await fetch('/api/seasons', { headers: { 'x-admin-token': t }, cache: 'no-cache' });
        const j = await r.json().catch(()=>({}));
        if (!r.ok || !j || !j.seasons) return;
        const fp = computeFingerprint(j.seasons||[], s => ({ id: String(s.id||''), n: String(s.name||''), a: !!(s.startDate), b: !!(s.endDate) }));
        if (fp !== SEASONS_FP) {
            currentSeasons = j.seasons || [];
            SEASONS_FP = fp;
            renderSeasons(currentSeasons);
            updateSeasonFilter();
        }
    }

    async function pollUsersIfChanged() {
        const r = await fetch('/api/users', { cache: 'no-cache' });
        const j = await r.json().catch(()=>({}));
        if (!j || !j.users) return;
        const fp = computeFingerprint(j.users||[], u => ({ id: String(u.id||''), e: String(u.email||''), p: String(u.phone||'') }));
        if (fp !== USERS_FP) {
            allUsers = j.users || [];
            USERS_FP = fp;
            renderUsers(allUsers);
        }
    }

    function ensureAdminAutoRefresh() {
        if (AUTO_REFRESH_HANDLE) return;
        AUTO_REFRESH_HANDLE = setInterval(async () => {
            try {
                await Promise.all([
                    pollProductsIfChanged(),
                    pollOrdersIfChanged(),
                    pollSeasonsIfChanged(),
                    pollUsersIfChanged()
                ]);
            } catch(e) { /* noop */ }
        }, 10000);
    }

    // Ouvrir le modal pour une nouvelle saison
    if (newSeasonBtn && seasonModal) {
        newSeasonBtn.addEventListener('click', () => {
            openSeasonModal(null);
        });
    }

    // Filtre par saison (afficher toutes ou une saison spécifique)
    if (seasonFilter) {
        seasonFilter.addEventListener('change', () => {
            currentSeasonFilter = seasonFilter.value || 'all';
            applyOrdersView();
        });
    }

    // Export PDF / CSV
    if (exportSeasonPdfBtn) {
        exportSeasonPdfBtn.addEventListener('click', () => {
            try { exportSeasonPdfMake(); }
            catch (e) { console.error('Erreur export PDF:', e); showToast('❌ Erreur', 'Export PDF impossible', 'error'); }
        });
    }
    if (exportSeasonCsvBtn) {
        exportSeasonCsvBtn.addEventListener('click', () => {
            try { exportSeasonCsv(); showToast('✅ Export CSV', 'Fichier téléchargé', 'success'); }
            catch (e) { console.error('Erreur export CSV:', e); showToast('❌ Erreur', 'Export CSV impossible', 'error'); }
        });
    }

    // Nettoyage associé à l'ancien champ supprimé

    // Sauvegarder (créer/mettre à jour) une saison
    if (saveSeasonBtn && seasonModal) {
        saveSeasonBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            const id = document.getElementById('seasonId').value;
            const name = document.getElementById('seasonName').value.trim();
            const startDate = document.getElementById('seasonStart').value;
            const endDate = document.getElementById('seasonEnd').value;
            const description = document.getElementById('seasonDescription').value.trim();
            const deliveryPointId = document.getElementById('seasonDeliveryPoint').value;
            if (!name || !startDate || !endDate || !deliveryPointId) {
                showToast('Erreur', 'Tous les champs obligatoires doivent être remplis', 'error');
                return;
            }
            const payload = { name, startDate, endDate, description, deliveryPointId };
            if (id) payload.id = id;
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/seasons?seasonId=${encodeURIComponent(id)}` : '/api/seasons';
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                body: JSON.stringify(payload)
            });
            const jr = await parseApiResponse(resp);
            if (resp.ok) {
                showToast('Succès', id ? 'Saison modifiée' : 'Saison créée', 'success');
                bootstrap.Modal.getInstance(document.getElementById('seasonModal')).hide();
                // Recharger les saisons
                if (typeof fetchSeasons === 'function') fetchSeasons(token);
            } else {
                showToast('Erreur', jr.message || 'Enregistrement impossible', 'error');
            }
        });
    }
    // Fonction d'export PDF (pdfmake) globale
    function exportSeasonPdfMake() {
        const list = currentSeasonFilter === 'all' ? currentOrders : currentOrders.filter(o => (o.seasonId || '') === currentSeasonFilter);
        const NAME_PRICES = window.NAME_PRICES || {};
        const NAME_WEIGHTS = window.NAME_WEIGHTS || {};
        const productsByName = {};
        try {
            (window.ADMIN_PRODUCTS || []).forEach(p => { productsByName[String(p.name||'').trim().toLowerCase()] = p; });
        } catch(e) {}
        const seasonName = (currentSeasons.find(s => s.id === currentSeasonFilter) || {}).name || (currentSeasonFilter === 'all' ? 'Toutes les saisons' : 'Saison');
        const sorted = [...list].sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')));
        let grandTotalPrice = 0, grandTotalWeight = 0;
        const sections = [];
        const recap = {}; // { label: { qty: number } } où label = "TYPE + POIDS"
        sorted.forEach(o => {
            let subTotalPrice = 0, subTotalWeight = 0;
            const body = [[
                { text: 'Article', bold: true },
                { text: 'Quantité', bold: true },
                { text: 'Prix Unitaire', bold: true },
                { text: 'Poids (kg)', bold: true },
                { text: 'Total (€)', bold: true },
                { text: 'Total Poids (kg)', bold: true }
            ]];
            (o.items || []).forEach(it => {
                const priceFromMap = resolveMap(NAME_PRICES, it.name);
                let unit = Number(priceFromMap !== undefined ? priceFromMap : (it.price || 0));
                if (!unit) {
                    const p = productsByName[String(it.name||'').trim().toLowerCase()];
                    unit = p ? Number(p.price)||0 : 0;
                }
                // Priorité au poids fourni par la commande, sinon mapping
                const weightFromItem = (typeof it.unitWeight === 'number') ? it.unitWeight : undefined;
                const weightFromMap = resolveMap(NAME_WEIGHTS, it.name);
                let wkg = Number(weightFromItem !== undefined ? weightFromItem : (weightFromMap || 0));
                if (!wkg) {
                    const p = productsByName[String(it.name||'').trim().toLowerCase()];
                    wkg = p ? Number(p.unitWeight)||0 : 0;
                }
                const qty = Number(it.quantity)||0;
                const linePrice = unit * qty;
                const lineWeight = wkg * qty;
                subTotalPrice += linePrice;
                subTotalWeight += lineWeight;
                // Récap global pour fournées
                const baseName = String(it.name||'').trim();
                const weightLabel = wkg ? `${wkg.toFixed(3)} kg` : '';
                const key = weightLabel ? `${baseName} ${weightLabel}` : baseName;
                if(!recap[key]) recap[key] = { qty:0 };
                recap[key].qty += qty;
                body.push([
                    it.name || '',
                    String(qty),
                    unit ? `€${unit.toFixed(2)}` : '-',
                    wkg ? wkg.toFixed(3) : '-',
                    `€${linePrice.toFixed(2)}`,
                    lineWeight ? lineWeight.toFixed(3) : '0.000'
                ]);
            });
            grandTotalPrice += subTotalPrice;
            grandTotalWeight += subTotalWeight;
            sections.push({
                margin: [0, 10, 0, 10],
                stack: [
                    { text: `${o.name} • ${o.phone || ''} • ${o.email || ''}`, style: 'clientHeader' },
                    { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'], body } },
                    { text: `Sous-total prix: €${subTotalPrice.toFixed(2)} • Sous-total poids: ${subTotalWeight.toFixed(3)} kg`, style: 'subtotals' }
                ]
            });
        });
        // Liste compacte "TYPE + POIDS × QUANTITÉ"
        const recapList = Object.keys(recap)
            .sort((a,b)=> a.localeCompare(b,'fr',{sensitivity:'base'}))
            .map(label => {
                const r = recap[label];
                return `${label} × ${r.qty}`;
            });
        const recapBlock = {
            margin:[0,20,0,0],
            stack:[
                { text: 'Récapitulatif Fournée (Boulanger)', style:'totals' },
                { text: recapList.join('\n'), margin:[0,8,0,0] }
            ]
        };
        const nowStr = new Date().toLocaleString('fr-FR');
        const selectedSeason = currentSeasonFilter !== 'all' ? (currentSeasons.find(s => s.id === currentSeasonFilter) || null) : null;
        const startStr = selectedSeason && selectedSeason.startDate ? new Date(selectedSeason.startDate).toLocaleDateString('fr-FR') : null;
        const endStr = selectedSeason && selectedSeason.endDate ? new Date(selectedSeason.endDate).toLocaleDateString('fr-FR') : null;
        const headerTitle = (selectedSeason && startStr && endStr)
            ? `Commandes de ${startStr} au ${endStr}`
            : `Commandes - ${seasonName}`;
        const docDefinition = {
            pageMargins: [40,60,40,40],
            header: { columns: [ { text: headerTitle, style: 'headerLeft' }, { text: nowStr, alignment: 'right', style: 'headerRight' } ], margin:[40,20,40,0] },
            content: [
                { text: `Total montant: €${grandTotalPrice.toFixed(2)}`, style: 'totals' },
                { text: `Total poids: ${grandTotalWeight.toFixed(3)} kg`, style: 'totals' },
                { text: ' ', margin: [0, 4, 0, 8] },
                ...sections,
                recapBlock
            ],
            styles: {
                headerLeft: { fontSize: 14, bold: true },
                headerRight: { fontSize: 10, color: '#555' },
                totals: { fontSize: 13, bold: true, color: '#2d3748' },
                clientHeader: { fontSize: 11, bold: true, margin: [0, 0, 0, 6], color:'#2d3748' },
                subtotals: { fontSize: 10, italics: true, margin: [0, 6, 0, 0], color:'#333' }
            },
            defaultStyle: { fontSize: 9 },
            footer: function(currentPage, pageCount) {
                return { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', margin:[0,0,20,0], fontSize:8, color:'#666' };
            }
        };
        // Appliquer layout zebra sur chaque table
        docDefinition.content.forEach(block => {
            if (block.table) {
                block.layout = {
                    fillColor: function (rowIndex) {
                        return rowIndex === 0 ? '#e2e8f0' : (rowIndex % 2 === 0 ? '#f8fafc' : null);
                    },
                    hLineColor: () => '#cbd5e0',
                    vLineColor: () => '#cbd5e0'
                };
            }
            if (block.stack) {
                block.stack.forEach(inner => {
                    if (inner.table) {
                        inner.layout = {
                            fillColor: function (rowIndex) {
                                return rowIndex === 0 ? '#e2e8f0' : (rowIndex % 2 === 0 ? '#f8fafc' : null);
                            },
                            hLineColor: () => '#cbd5e0',
                            vLineColor: () => '#cbd5e0'
                        };
                    }
                });
            }
        });
        if (window.pdfMake && window.pdfMake.createPdf) window.pdfMake.createPdf(docDefinition).download('commandes.pdf');
        else showToast('❌ Erreur', 'pdfmake non chargé', 'error');
    }

    function exportSeasonCsv() {
        const list = currentSeasonFilter === 'all' ? currentOrders : currentOrders.filter(o => (o.seasonId || '') === currentSeasonFilter);
        const prices = window.NAME_PRICES || {};
        const weights = window.NAME_WEIGHTS || {};
        const rows = [];
        rows.push(['Client','Email','Téléphone','Saison','Article','Quantité','Prix Unitaire (€)','Poids Unitaire (kg)','Total Ligne (€)','Total Ligne Poids (kg)']);
        list.forEach(o => {
            (o.items || []).forEach(it => {
            const qty = Number(it.quantity)||0;
            const unitPrice = (typeof it.price === 'number') ? it.price : (prices[it.name] || 0);
            const unitWeight = (typeof it.unitWeight === 'number') ? it.unitWeight : Number(weights[it.name] || 0);
                const linePrice = unitPrice * qty;
                const lineWeight = unitWeight * qty;
                rows.push([
                    o.name || '',
                    o.email || '',
                    o.phone || '',
                    o.seasonName || o.seasonId || '',
                    it.name || '',
                    String(qty),
                    unitPrice ? unitPrice.toFixed(2) : '0.00',
                    unitWeight ? unitWeight.toFixed(3) : '0.000',
                    linePrice.toFixed(2),
                    lineWeight.toFixed(3)
                ]);
            });
        });
        const csv = rows.map(r => r.map(v => {
            const s = String(v).replace(/"/g,'""');
            return /[",;\n]/.test(s) ? '"'+s+'"' : s;
        }).join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'commandes.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Chargement et rendu des utilisateurs
    async function fetchUsers() {
        try {
            const resp = await fetch('/api/users');
            const jr = await parseApiResponse(resp);
            if (!resp.ok) {
                console.error('Erreur get-users:', jr && jr.message);
                renderUsers([]);
                return;
            }
            allUsers = (jr && jr.users) ? jr.users : [];
            renderUsers(allUsers);
        } catch (e) {
            console.error('Erreur réseau get-users:', e);
            renderUsers([]);
        }
    }

    function normalize(str) { return String(str || '').toLowerCase(); }

    function userMatchesQuery(user, q) {
        const nq = normalize(q);
        if (!nq) return true;
        const fields = [user.name, user.email, user.phone];
        return fields.some(f => normalize(f).includes(nq));
    }

    function renderUsers(list) {
        if (!adminUsersList) return;
        const q = adminUserSearchQuery ? adminUserSearchQuery.value : '';
        const filtered = list.filter(u => userMatchesQuery(u, q));
        if (filtered.length === 0) {
            adminUsersList.innerHTML = '<div class="alert alert-info">Aucun utilisateur</div>';
            return;
        }
        const items = filtered.map(u => {
            const name = u.name || (u.email ? u.email.split('@')[0] : '—');
            const email = u.email || '';
            const phone = u.phone || '';
            const emailHtml = email
                ? `<div class="d-flex align-items-center justify-content-between gap-2">
                        <div>📧 <a href="mailto:${email}" class="user-mail" data-value="${email}">${email}</a></div>
                        <button type="button" class="btn btn-sm btn-outline-primary copy-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="Copier l'email" data-value="${email}">📋</button>
                   </div>`
                : `<div>📧 —</div>`;
            const phoneHtml = phone
                ? `<div class="d-flex align-items-center justify-content-between gap-2 mt-1">
                        <div>📞 <a href="tel:${phone}" class="user-phone" data-value="${phone}">${phone}</a></div>
                        <button type="button" class="btn btn-sm btn-outline-primary copy-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="Copier le téléphone" data-value="${phone}">📋</button>
                   </div>`
                : '';
            const details = `<div class="mt-2 small">${emailHtml}${phoneHtml}</div>`;
            return `<div class="list-group-item list-group-item-action user-item" data-user-id="${u.id}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="me-2"><strong>${name}</strong></div>
                            <button type="button" class="btn btn-sm btn-outline-secondary user-toggle">Détails</button>
                        </div>
                        <div class="user-details d-none">${details}</div>
                    </div>`;
        }).join('');
        adminUsersList.innerHTML = items;
        // Toggle details only when clicking the toggle button
        adminUsersList.querySelectorAll('.user-item .user-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const item = e.currentTarget.closest('.user-item');
                const details = item && item.querySelector('.user-details');
                if (details) details.classList.toggle('d-none');
            });
        });
        // Copy buttons for email/phone
        adminUsersList.querySelectorAll('.user-item .copy-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const val = e.currentTarget.getAttribute('data-value') || '';
                try {
                    if (val) {
                        await navigator.clipboard.writeText(val);
                        showToast('📋 Copié', 'Copié dans le presse-papiers', 'success');
                    }
                } catch (err) {
                    console.error('Clipboard error:', err);
                    showToast('❌ Erreur', 'Impossible de copier', 'error');
                }
            });
        });
        // Prevent details toggle when tapping links
        adminUsersList.querySelectorAll('.user-item .user-mail, .user-item .user-phone').forEach(a => {
            a.addEventListener('click', (e) => { e.stopPropagation(); });
        });
        // Initialiser tooltips Bootstrap pour nouveaux boutons
        try {
            const tooltipTriggerList = Array.from(adminUsersList.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(el => { try { new bootstrap.Tooltip(el); } catch(_) {/* noop */} });
        } catch(e) { /* noop */ }
    }

    if (adminUserSearchQuery) {
        adminUserSearchQuery.addEventListener('input', () => {
            renderUsers(allUsers);
        });
    }
    if (adminUsersReload) {
        adminUsersReload.addEventListener('click', async () => {
            showPageLoader('Chargement des utilisateurs…');
            try { await fetchUsers(); } finally { hidePageLoader(); }
        });
    }

    // --- Points de livraison ---
    let deliveryPoints = [];
    async function loadDeliveryPoints() {
        const listEl = document.getElementById('deliveryPointsList');
        if (!listEl) {
            console.error('deliveryPointsList introuvable dans le DOM');
            return;
        }
        listEl.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div></div>';
        let data;
        try {
            const resp = await fetch('/api/delivery-points');
            data = await parseApiResponse(resp);
        } catch (err) {
            listEl.innerHTML = '<div class="text-danger">Erreur de chargement des points de livraison (fetch): ' + err + '</div>';
            return;
        }
        deliveryPoints = (data && data.points) ? data.points : [];
        console.log('Points de livraison reçus:', deliveryPoints);
        if (!deliveryPoints.length) {
            listEl.innerHTML = '<div class="text-warning">Aucun point de livraison trouvé ou chargement impossible.<br><small>Vérifiez l’authentification ou la connexion API.</small></div>';
            return;
        }
        listEl.innerHTML = deliveryPoints.map(pt => `
            <div class="border rounded p-2 mb-2 d-flex justify-content-between align-items-center">
                <div>
                    <strong>${pt.name}</strong> <span class="text-muted">(${pt.city})</span><br>
                    <span class="small">${pt.address}</span>
                    ${pt.info ? `<br><span class='text-muted small'>${pt.info}</span>` : ''}
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${pt.id}">Éditer</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${pt.id}">Supprimer</button>
                </div>
            </div>
        `).join('');
        listEl.innerHTML += '<pre style="background:#fff;color:#333;padding:8px;border-radius:6px;">' + JSON.stringify(deliveryPoints, null, 2) + '</pre>';
        // Bind actions
        listEl.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                const action = btn.getAttribute('data-action');
                const pt = deliveryPoints.find(x => x.id === id);
                if (action === 'edit') openDeliveryPointModal(pt);
                if (action === 'delete') {
                    const token = localStorage.getItem('adminToken');
                    if (!confirm('Confirmer la suppression ?')) return;
                    const resp = await fetch('/api/delivery-points', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ id })
                    });
                    const jr = await parseApiResponse(resp);
                    if (resp.ok) { showToast('Succès', 'Point supprimé', 'success'); loadDeliveryPoints(); }
                    else showToast('Erreur', jr.message || 'Suppression impossible', 'error');
                }
            });
        });
    }
    function openDeliveryPointModal(pt) {
        const modal = new bootstrap.Modal(document.getElementById('deliveryPointModal'));
        document.getElementById('deliveryPointId').value = pt?.id || '';
        document.getElementById('deliveryPointName').value = pt?.name || '';
        document.getElementById('deliveryPointCity').value = pt?.city || '';
        document.getElementById('deliveryPointAddress').value = pt?.address || '';
        document.getElementById('deliveryPointInfo').value = pt?.info || '';
        modal.show();
    }
    document.getElementById('addDeliveryPointBtn')?.addEventListener('click', () => openDeliveryPointModal());
    document.getElementById('deliveryPointForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        const id = document.getElementById('deliveryPointId').value;
        const name = document.getElementById('deliveryPointName').value.trim();
        const city = document.getElementById('deliveryPointCity').value.trim();
        const address = document.getElementById('deliveryPointAddress').value.trim();
        const info = document.getElementById('deliveryPointInfo').value.trim();
        if (!name || !city || !address) {
            showToast('Erreur', 'Nom, ville et adresse requis', 'error');
            return;
        }
        const resp = await fetch('/api/delivery-points', {
            method: id ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ id, name, city, address, info })
        });
        const jr = await parseApiResponse(resp);
        if (resp.ok) {
            showToast('Succès', id ? 'Point modifié' : 'Point ajouté', 'success');
            bootstrap.Modal.getInstance(document.getElementById('deliveryPointModal')).hide();
            loadDeliveryPoints();
        } else {
            showToast('Erreur', jr.message || 'Enregistrement impossible', 'error');
        }
    });
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded: appel forcé de loadDeliveryPoints');
        loadDeliveryPoints();
    });

    // Utilitaire pour parser la réponse API en JSON ou texte
    async function parseApiResponse(response) {
        try {
            return await response.json();
        } catch (err) {
            const text = await response.text().catch(() => '');
            return { message: text || 'Réponse serveur invalide' };
        }
    }
});
