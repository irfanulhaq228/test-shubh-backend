const mongoose = require('mongoose');

const loginDetailsSchema = new mongoose.Schema({
    loginDateTime: { type: Date, default: Date.now },
    ipAddress: { type: String },
    isp: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    sports: { type: Boolean, default: true },
    casino: { type: Boolean, default: true },
    wallet: { type: Number, default: 0 },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    master: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    loginDetails: [loginDetailsSchema],
    oddsPrice: { type: [Number], default: [1000, 2000, 3000, 4000, 5000] },
    fcmTokens: { type: String, default: "" },
    exposure: { type: Number, default: 0 },
    sportPermission: { type: Object, default: {} },
    firstTime: { type: Boolean, default: false },
    bonusAmount: { type: String },
    bonusType: { type: String },
    bonusValue: { type: String },
    creditTransaction: {type: Number, default: 0}
}, {
    timestamps: true
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;
