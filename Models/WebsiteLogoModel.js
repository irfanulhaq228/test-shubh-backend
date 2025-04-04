const mongoose = require('mongoose');

const WebsiteLogoSchema = new mongoose.Schema({
    image: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

const WebsiteLogoModel = mongoose.model('WebsiteLogo', WebsiteLogoSchema);

module.exports = WebsiteLogoModel;
