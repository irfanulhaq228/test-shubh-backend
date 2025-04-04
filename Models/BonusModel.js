const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
    bonusAmount: { type: String, default: "" }, //
    bonusType: { type: String, default: "" }, //
    bonusValue: { type: String, default: "" }, //
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    status: { type: String, default: "pending" },
    givenTime: { type: String, default: "-" }
}, {
    timestamps: true
});

const bonusModel = mongoose.model('Bonus', bonusSchema);

module.exports = bonusModel;
