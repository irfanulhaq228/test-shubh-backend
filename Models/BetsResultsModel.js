const mongoose = require('mongoose');

const betsResultSchema = new mongoose.Schema({
    eventId: { type: String },
    marketId: { type: String },
    result: { type: String },
    resultType: { type: String },
    runnerName: { type: String }
}, {
    timestamps: true
});

const betsResultModel = mongoose.model('BetsResult', betsResultSchema);

module.exports = betsResultModel;
