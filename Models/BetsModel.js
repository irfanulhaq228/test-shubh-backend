const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    afterLoss: { type: Number, required: true },
    afterWin: { type: Number, required: true },
    amount: { type: Number, required: true },
    eventId: { type: String, required: true },
    gameId: { type: String, required: true },
    gameName: { type: String, required: true },
    loss: { type: Number, required: true },
    marketId: { type: String, required: true },
    marketName: { type: String, required: true },
    selectionName: { type: String, default: "" },
    side: { type: String },
    sportId: { type: String },
    status: { type: String, default: "pending" },
    isRolledback: { type: Boolean, default: false },
    ipAddress: { type: String, default: "" },
    adminCommision: { type: Number, default: 0 },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tno: { type: Number },
    // ----
    stake: { type: Number },
    odd: { type: Number, required: true },
    size: { type: Number, required: true },
    duplicateOdd: { type: Number },
    profit: { type: Number, required: true },
    exposure: { type: Number },
    matchOddMrId: { type: String }
}, {
    timestamps: true
});

const betModel = mongoose.model('Bet', betSchema);

module.exports = betModel;
