const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');

// Models
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey123';

// Directories Setup
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully! 🎉'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// --- AUTH ROUTES ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Registration Successful! 🎉' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password!' });

    const token = jwt.encode({ id: user._id, name: user.name, email: user.email }, JWT_SECRET);
    res.status(200).json({ message: 'Login Successful! 🔓', token, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCT ROUTES ---

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', upload.single('imageFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image file is required!" });
    const { name, price, category, description } = req.body;
    const newProduct = new Product({
      name, price, category: category || 'General', image: `/uploads/${req.file.filename}`, description
    });
    const saved = await newProduct.save();
    res.status(201).json({ message: "Product Created Successfully! 🎉", data: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', upload.single('imageFile'), async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    let updateData = { name, price, category, description };
    if (req.file) updateData.image = `/uploads/${req.file.filename}`;
    
    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json({ message: "Product Updated Successfully! ✏️", data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product Deleted Successfully! 🗑️" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ORDER ROUTES ---

// Place New Order
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, phone, deliveryZone, address, items, subtotal } = req.body;

    const deliveryCharge = deliveryZone === 'inside' ? 70 : 130;
    const totalAmount = Number(subtotal) + deliveryCharge;

    const newOrder = new Order({
      customerName,
      phone,
      deliveryZone,
      deliveryCharge,
      address,
      paymentMethod: 'Cash on Delivery',
      items,
      subtotal,
      totalAmount,
      status: 'Pending'
    });

    await newOrder.save();
    res.status(201).json({ message: "Order Placed Successfully! 📦", order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Orders for Admin
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({ count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});