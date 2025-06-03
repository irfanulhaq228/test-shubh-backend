const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
    amount: { type: Number },
    bonusType: { type: String },
    olderBonusRows: { type: [] },
    bonusAmountType: { type: String },
    status: { type: String, default: 'pending' },
    selectedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, {
    timestamps: true
});

const bonusModel = mongoose.model('Bonus', bonusSchema);

module.exports = bonusModel;
