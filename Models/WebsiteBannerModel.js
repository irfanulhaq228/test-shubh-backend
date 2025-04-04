const mongoose = require('mongoose');

const WebsiteBannerSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    image: { type: String, required: true },
}, {
    timestamps: true
});

const WebsiteBannerModel = mongoose.model('WebsiteBanner', WebsiteBannerSchema);

module.exports = WebsiteBannerModel;
