const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    type: { type: String },
    amount: { type: Number },
    status: { type: String },
    createdDate: { type: Date },
    updatedDate: { type: Date },
    actionId: { type: String }
}, {
    timestamps: true
});

const userModel = mongoose.model('Ledger', ledgerSchema);

module.exports = userModel;
