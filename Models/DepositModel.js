const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bank: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    amount: { type: Number },
    receipt: { type: String },
    transactionId: { type: Number },
    status: { type: String },
}, {
    timestamps: true
});

const depositModel = mongoose.model('Deposit', depositSchema);

module.exports = depositModel;
