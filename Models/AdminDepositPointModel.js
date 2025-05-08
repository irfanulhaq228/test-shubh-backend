const mongoose = require('mongoose');

const adminDepositSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    amount: { type: Number },
    status: { type: String, default: "pending" },
}, {
    timestamps: true
});

const adminDepositModel = mongoose.model('AdminDeposit', adminDepositSchema);

module.exports = adminDepositModel;
