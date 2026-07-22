const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  deliveryZone: { type: String, enum: ['inside', 'outside'], required: true },
  deliveryCharge: { type: Number, required: true },
  address: { type: String, required: true },
  paymentMethod: { type: String, default: 'Cash on Delivery' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number
  }],
  subtotal: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);