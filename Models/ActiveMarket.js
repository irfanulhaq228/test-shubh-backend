const mongoose = require('mongoose');

const activeMarketSchema = new mongoose.Schema({
    Sportid: { type: String, required: true },
    market_id: { type: String, required: true },
    marketname: { type: String, required: true },
    match_id: { type: String, required: true },
    eventname: { type: String, required: true },
    openDate: { type: Date, required: true }
}, {
    timestamps: true
});

const ActiveMarket = mongoose.model('ActiveMarket', activeMarketSchema);

module.exports = ActiveMarket;