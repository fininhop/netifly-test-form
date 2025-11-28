const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    global.db = admin.firestore();
  } catch (e) {
    console.error('Erreur initialisation Admin SDK (products):', e.message);
    global.adminInitError = e;
  }
} else {
  global.db = admin.firestore();
}

module.exports = async function handler(req, res) {
  try {
    if (global.adminInitError) {
      return res.status(500).json({ ok: false, error: 'Erreur configuration serveur' });
    }
    const col = global.db.collection('products');
    const catCol = global.db.collection('categories');

    // Categories management within the same endpoint to avoid extra functions
    if (req.method === 'GET' && (req.query.categories === '1' || req.query.categories === 'true')) {
      const catsSnap = await catCol.get();
      const cats = catsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
      // compute product counts per category
      const prodsSnap = await col.get();
      const counts = new Map();
      prodsSnap.docs.forEach(d => {
        const data = d.data() || {};
        const c = (data.category || '').trim();
        if (!c) return;
        counts.set(c, (counts.get(c) || 0) + 1);
      });
      const categories = cats.map(c => ({ id: c.id, name: c.name, productCount: counts.get(c.name) || 0 }));
      return res.status(200).json({ ok: true, categories });
    }

    if ((req.method === 'POST' || req.method === 'PUT') && req.query.category === '1') {
      const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
      const expected = process.env.ADMIN_TOKEN || null;
      if (!expected || provided !== expected) {
        return res.status(401).json({ ok: false, error: 'Accès administrateur requis' });
      }
      const { name } = req.body || {};
      const cat = String((name || '').trim());
      if (!cat) return res.status(400).json({ ok: false, error: 'Nom de catégorie requis' });
      // upsert category by name uniqueness
      const existsSnap = await catCol.where('name', '==', cat).get();
      if (!existsSnap.empty) {
        const id = existsSnap.docs[0].id;
        await catCol.doc(id).set({ name: cat }, { merge: true });
        return res.status(200).json({ ok: true, id });
      }
      const ref = await catCol.add({ name: cat, createdAt: new Date().toISOString() });
      return res.status(201).json({ ok: true, id: ref.id });
    }

    if (req.method === 'DELETE' && req.query.category) {
      const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
      const expected = process.env.ADMIN_TOKEN || null;
      if (!expected || provided !== expected) {
        return res.status(401).json({ ok: false, error: 'Accès administrateur requis' });
      }
      const catName = String((req.query.category || '').trim());
      if (!catName) return res.status(400).json({ ok: false, error: 'Nom de catégorie requis' });
      // ensure no products in this category
      const inUseSnap = await col.where('category', '==', catName).limit(1).get();
      if (!inUseSnap.empty) return res.status(400).json({ ok: false, error: 'Catégorie non vide: supprimez ou déplacez les produits d\'abord' });
      const existsSnap = await catCol.where('name', '==', catName).get();
      if (existsSnap.empty) return res.status(404).json({ ok: false, error: 'Catégorie introuvable' });
      const id = existsSnap.docs[0].id;
      await catCol.doc(id).delete();
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const snap = await col.get();
      let products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      products.forEach(p => { if (p.sortOrder === undefined) p.sortOrder = 0; if (p.category === undefined) p.category = ''; });
      products.sort((a,b)=>{
        const ca = String(a.category||'').toLowerCase();
        const cb = String(b.category||'').toLowerCase();
        if (ca < cb) return -1; if (ca > cb) return 1;
        const sa = Number(a.sortOrder||0), sb = Number(b.sortOrder||0);
        if (sa !== sb) return sa - sb;
        return String(a.name||'').localeCompare(String(b.name||''));
      });
      return res.status(200).json({ ok: true, products });
    }

    if (req.method === 'POST') {
      const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
      const expected = process.env.ADMIN_TOKEN || null;
      if (!expected || provided !== expected) {
        return res.status(401).json({ ok: false, error: 'Accès administrateur requis' });
      }
      const { name, price, unitWeight, active, category, sortOrder } = req.body || {};
      if (!name || typeof price !== 'number' || typeof unitWeight !== 'number') {
        return res.status(400).json({ ok: false, error: 'Champs requis: name, price(number), unitWeight(number)' });
      }
      const cat = (category ? String(category).trim() : '');
      if (!cat) {
        return res.status(400).json({ ok: false, error: 'Catégorie requise' });
      }

      let finalSortOrder;
      if (typeof sortOrder === 'number' && !Number.isNaN(sortOrder)) {
        finalSortOrder = sortOrder;
      } else {
        // Compute to appear first: take minimum existing sortOrder in category and minus one
        const qsnap = await col.where('category', '==', cat).get();
        let minSo = null;
        qsnap.forEach(d => {
          const so = Number((d.data() || {}).sortOrder || 0);
          if (minSo === null || so < minSo) minSo = so;
        });
        finalSortOrder = (minSo === null) ? 0 : (minSo - 1);
      }

      const doc = {
        name: String(name).trim(),
        price,
        unitWeight,
        active: active === undefined ? true : !!active,
        category: cat,
        sortOrder: finalSortOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await col.add(doc);
      return res.status(201).json({ ok: true, id: ref.id });
    }

    if (req.method === 'PUT') {
      const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
      const expected = process.env.ADMIN_TOKEN || null;
      if (!expected || provided !== expected) {
        return res.status(401).json({ ok: false, error: 'Accès administrateur requis' });
      }
      const id = req.query.id;
      if (!id) return res.status(400).json({ ok: false, error: 'Paramètre id manquant' });
      const { name, price, unitWeight, active, category, sortOrder } = req.body || {};
      const update = { updatedAt: new Date().toISOString() };
      if (name !== undefined) update.name = String(name).trim();
      if (price !== undefined) update.price = Number(price);
      if (unitWeight !== undefined) update.unitWeight = Number(unitWeight);
      if (active !== undefined) update.active = !!active;
      if (category !== undefined) {
        const cat = String(category || '').trim();
        if (!cat) return res.status(400).json({ ok: false, error: 'Catégorie requise' });
        update.category = cat;
      }
      if (sortOrder !== undefined) {
        const so = Number(sortOrder);
        if (!Number.isFinite(so)) return res.status(400).json({ ok: false, error: 'Position d\'affichage invalide' });
        update.sortOrder = so;
      }
      await col.doc(id).set(update, { merge: true });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
      const expected = process.env.ADMIN_TOKEN || null;
      if (!expected || provided !== expected) {
        return res.status(401).json({ ok: false, error: 'Accès administrateur requis' });
      }
      const id = req.query.id;
      if (!id) return res.status(400).json({ ok: false, error: 'Paramètre id manquant' });
      await col.doc(id).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('products API error', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
}
