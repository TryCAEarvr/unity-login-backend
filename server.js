require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Error", err));

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// --- helper: auth middleware ---
function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success:false, message: 'No token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { email, userId }
    next();
  } catch (e) {
    return res.status(401).json({ success:false, message: 'Invalid token' });
  }
}

// --- login ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: "Invalid email" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false, message: "Wrong password" });

  const token = jwt.sign(
    { email: user.email, userId: user._id },
    JWT_SECRET,
    { expiresIn: '12h' } // longer session
  );

  res.json({
    success: true,
    token,
    isSubscribed: !!user.subscription?.active,
    expiry: user.subscription?.expiry || null,
    productId: user.subscription?.productId || null
  });
});

// --- check subscription (Unity calls this at app start) ---
app.get('/api/check-subscription', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  if (!user) return res.status(404).json({ success:false, message:'User not found' });
  res.json({
    success: true,
    isSubscribed: !!user.subscription?.active,
    expiry: user.subscription?.expiry || null,
    productId: user.subscription?.productId || null
  });
});

// --- update subscription (Unity calls after Play purchase) ---
app.post('/api/update-subscription', auth, async (req, res) => {
  const { active, productId, expiry, purchaseToken } = req.body;

  const update = {
    'subscription.active': !!active,
    'subscription.productId': productId || null,
    'subscription.purchaseToken': purchaseToken || null,
  };
  if (expiry) update['subscription.expiry'] = new Date(expiry);

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $set: update },
    { new: true }
  );

  if (!user) return res.status(404).json({ success:false, message:'User not found' });

  res.json({
    success: true,
    isSubscribed: !!user.subscription?.active,
    expiry: user.subscription?.expiry || null,
    productId: user.subscription?.productId || null
  });
});

// simple health
app.get('/health', (req,res)=>res.send('OK'));

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
