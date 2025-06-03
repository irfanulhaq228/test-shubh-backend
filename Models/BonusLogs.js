// const mongoose = require('mongoose')

// const bonusLogSchema = new mongoose.Schema({
//     bonus: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Bonus'
//     },
//     deposit: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Deposit'
//     },
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     },
//     userArray: [{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User'
//     }],
//     master: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Staff'
//     },
//     admin: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Admin'
//     },
//     level: {
//         type: Number,
//         required: true
//     },
//     bonusTotalAmount: { type: Number, default: 0 },
// }, {
//     timestamps: true
// })

// const bonusLogModel = mongoose.model('BonusLogs', bonusLogSchema)

// module.exports = bonusLogModel

const mongoose = require('mongoose')

const bonusLogSchema = new mongoose.Schema({
    bonus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bonus'
    },
    master: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    refillUserArray: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    userArray: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number, required: true },
        _id: false
    }],
    // Total bonus distributed
    bonusTotalAmount: { type: Number, default: 0 },

    // Grouped users by levels
    level: {
        type: Number
    }
}, { timestamps: true })

const bonusLogModel = mongoose.model('BonusLogs', bonusLogSchema)
module.exports = bonusLogModel