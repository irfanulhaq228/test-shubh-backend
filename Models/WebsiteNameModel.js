const mongoose = require('mongoose');

const WebsiteNameSchema = new mongoose.Schema({
    name: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
    timestamps: true
});

const WebsiteNameModel = mongoose.model('WebsiteName', WebsiteNameSchema);

module.exports = WebsiteNameModel;
