const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
    mainColor: { type: String, required: true, unique: true },
    secColor: { type: String, required: true },
    status: { type: Boolean, default: false },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

const colorModel = mongoose.model('Color', colorSchema);

module.exports = colorModel;
