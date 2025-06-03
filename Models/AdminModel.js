const mongoose = require('mongoose');

const loginDetailsSchema = new mongoose.Schema({
    loginDateTime: { type: Date, default: Date.now },
    ipAddress: { type: String },
    isp: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
}, { _id: false });

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String },
    otpExpiration: { type: Date },
    verified: { type: Boolean, default: false },
    loginDetails: [loginDetailsSchema],
    domain: { type: String, default: "" },

    wallet: { type: Number, default: 0 },
    pendingDeposit: { type: Number, default: 0 },
    
    fcmTokens: { type: String, default: "" },
    firstTime: { type: Boolean, default: false },

    oddRate: { type: Number, default: 0 },
    oddRateType: { type: String, default: "percentage" },

    bookmakerRate: { type: Number, default: 0 },
    bookmakerRateType: { type: String, default: "percentage" },

    fancyRate: { type: Number, default: 0 },
    fancyRateType: { type: String, default: "number" },

    creditTransaction: {type: Number, default: 0},
}, {
    timestamps: true
});

const adminModel = mongoose.model('Admin', adminSchema);

module.exports = adminModel;
