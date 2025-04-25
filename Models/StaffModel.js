const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true },
    password: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    type: { type: String },
    phone: { type: String },
    enableBanks: { type: Boolean, default: true },
    validate: { type: String, default: "111111" },
    bets: { type: Boolean, default: true },
    verified: { type: Boolean, default: true },
    dashboard: { type: {}, default: { edit: false, view: true } },
    games: { type: {}, default: { edit: false, view: false } },
    paymentInformation: { type: {}, default: { edit: false, view: false } },
    webSettings: { type: {}, default: { edit: false, view: false } },
    wallet: { type: Number, default: 0 },
    firstTime: { type: Boolean, default: true }
}, {
    timestamps: true
});

const staffModel = mongoose.model('Staff', staffSchema);

module.exports = staffModel;
