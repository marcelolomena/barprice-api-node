const express = require('express')
const admin = require('firebase-admin')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')

const app = express()
app.use(helmet())

// Rate limiting: max 30 requests por IP cada 1 minuto
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' },
})
app.use(limiter)

// Validar API key
const API_KEY = process.env.API_KEY
const requireApiKey = (req, res, next) => {
  if (!API_KEY) return next() // si no está configurada, no bloquea (desarrollo local)
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  next()
}

const credentials = process.env.FIREBASE_CREDENTIALS
  ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
  : require('./firebase-credentials.json')

admin.initializeApp({ credential: admin.credential.cert(credentials) })
const db = admin.firestore()

// Barcode: solo dígitos, entre 4 y 20 caracteres
const isValidBarcode = barcode => /^\d{4,20}$/.test(barcode)

app.get('/api/products', requireApiKey, async (req, res) => {
  try {
    const snapshot = await db.collection('products').get()
    const products = snapshot.docs.map(doc => ({ barcode: doc.id, ...doc.data() }))
    res.json(products)
  } catch (e) {
    res.status(500).json({ error: 'Error interno' })
  }
})

app.get('/api/products/:barcode', requireApiKey, async (req, res) => {
  const { barcode } = req.params
  if (!isValidBarcode(barcode.trim())) {
    return res.status(400).json({ error: 'Código de barras inválido' })
  }
  try {
    const doc = await db.collection('products').doc(barcode.trim()).get()
    if (!doc.exists) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ barcode, ...doc.data() })
  } catch (e) {
    res.status(500).json({ error: 'Error interno' })
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`))
