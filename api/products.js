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

    if (req.method === 'GET') {
      const snap = await col.orderBy('name').get();
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ ok: true, products });
    }

    if (req.method === 'POST') {
      const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
      const expected = process.env.ADMIN_TOKEN || null;
      if (!expected || provided !== expected) {
        return res.status(401).json({ ok: false, error: 'Accès administrateur requis' });
      }
      const { name, price, unitWeight, active } = req.body || {};
      if (!name || typeof price !== 'number' || typeof unitWeight !== 'number') {
        return res.status(400).json({ ok: false, error: 'Champs requis: name, price(number), unitWeight(number)' });
      }
      const doc = {
        name: String(name).trim(),
        price,
        unitWeight,
        active: active === undefined ? true : !!active,
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
      const { name, price, unitWeight, active } = req.body || {};
      const update = { updatedAt: new Date().toISOString() };
      if (name !== undefined) update.name = String(name).trim();
      if (price !== undefined) update.price = Number(price);
      if (unitWeight !== undefined) update.unitWeight = Number(unitWeight);
      if (active !== undefined) update.active = !!active;
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
