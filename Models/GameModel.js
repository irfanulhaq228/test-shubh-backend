const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    image: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    admins: [{
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        status: { type: Boolean, default: true }
    }],
    adminCommision: { type: Number, default: 0 }
}, {
    timestamps: true
});

const gameModel = mongoose.model('Game', gameSchema);

module.exports = gameModel;

// ==========================================================================================

// const mongoose = require('mongoose');

// const gameSchema = new mongoose.Schema({
//     image: { type: String, required: true, unique: true },
//     name: { type: String, required: true, unique: true },
//     disabled: { type: Boolean, default: false },
//     admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
//     adminCommision: { type: Number, default: 0 }
// }, {
//     timestamps: true
// });

// const gameModel = mongoose.model('Game', gameSchema);

// module.exports = gameModel;
