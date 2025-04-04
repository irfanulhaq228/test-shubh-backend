const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventId: String,
    eventName: String,
    date: Date
});

const competitionSchema = new mongoose.Schema({
    competitionName: String,
    competitionId: String,
    events: [eventSchema]
});

const sportSchema = new mongoose.Schema({
    sportName: String,
    sportId: String,
    competitions: [competitionSchema]
});

const EventModel = mongoose.model('Event', sportSchema);

module.exports = EventModel;