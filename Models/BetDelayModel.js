const mongoose = require('mongoose');

const BetDelaySchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    delayTime: { type: String, required: true },
}, {
    timestamps: true
});

const BetDelayModel = mongoose.model('BetDelay', BetDelaySchema);

module.exports = BetDelayModel;
