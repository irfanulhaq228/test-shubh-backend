const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, {
    timestamps: true
});

const superAdminModel = mongoose.model('SuperAdmin', superAdminSchema);

module.exports = superAdminModel;
