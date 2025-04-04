const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    accountNo: { type: String, default: "" },
    bank: { type: String, default: "" },
    ibn: { type: String, default: "" },
    name: { type: String, default: false },
    image: { type: String, default: "" },
    status: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    masterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
}, {
    timestamps: true
});

const bankModel = mongoose.model('Bank', bankSchema);

module.exports = bankModel;
