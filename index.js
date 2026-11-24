const express = require('express')
const admin = require('firebase-admin')


const app = express()
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})

// Inicializar Firebase desde variable de entorno o archivo local
const credentials = process.env.FIREBASE_CREDENTIALS
  ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
  : require('./firebase-credentials.json')

admin.initializeApp({
  credential: admin.credential.cert(credentials),
})

const db = admin.firestore()

app.get('/api/products', async (req, res) => {
  try {
    const snapshot = await db.collection('products').get()
    const products = snapshot.docs.map(doc => ({ barcode: doc.id, ...doc.data() }))
    res.json(products)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/products/:barcode', async (req, res) => {
  const { barcode } = req.params
  try {
    const doc = await db.collection('products').doc(barcode.trim()).get()
    if (!doc.exists) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ barcode, ...doc.data() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`))
