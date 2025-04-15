const fs = require('fs');
const redis = require('redis');
const { default: axios } = require('axios');
const gameModel = require('../Models/GameModel');
const EventModel = require('../Models/EventsModel');

const fn_getExtraMarketsData = async (req, res) => {
    try {
        const { eventId } = req.query;
        console.log("eventId ", eventId);
        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls/bookmakerFancy?&apiType=all&eventId=${eventId}`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.error("Error in fn_getExtraMarketsData:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

module.exports = {
    fn_getExtraMarketsData,
};