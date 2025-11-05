const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },

  // NEW: subscription info
  subscription: {
    active: { type: Boolean, default: false },
    productId: { type: String, default: null },     // e.g. "trycae_premium"
    expiry: { type: Date, default: null },          // optional (for monthly)
    purchaseToken: { type: String, default: null }  // optional (Google Play)
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
