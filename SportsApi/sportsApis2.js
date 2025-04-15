const fs = require('fs');
const redis = require('redis');
const { default: axios } = require('axios');
const gameModel = require('../Models/GameModel');
const EventModel = require('../Models/EventsModel');
const betModel = require('../Models/BetsModel');
const userModel = require('../Models/UserModel');

const fn_getExtraMarketsData = async (req, res) => {
    try {
        const { eventId } = req.query;
        if (!eventId) return res.status(400).res({ message: "No Event ID Found" });

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls/bookmakerFancy?&apiType=all&eventId=${eventId}`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.error("Error in fn_getExtraMarketsData:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

const fn_getFancyResults = async (req, res) => {
    try {
        const { eventId } = req.query;
        if (!eventId) return res.status(400).res({ message: "No Event ID Found" });

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls/fancyResultData?eventId=${eventId}`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.error("Error in fn_getFancyResults:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

const fn_declareFancyResult = async (req, res) => {
    try {
        const pendingFancy = await betModel.find({ status: "pending", marketName: "Normal" });
        if (pendingFancy?.length === 0) return res.status(400).json({ message: "No Fancy Found..." });

        pendingFancy?.map(async (item) => {
            const result = await axios.get(`https://api.trovetown.co/v1/apiCalls/fancyResultData?eventId=${item?.eventId}`);
            if (!result) return;

            const resultedBet = result?.data?.find((i) => (i?.fancyName).toLowerCase() === item?.selectionName);
            if (!resultedBet) return;

            const runsMade = resultedBet?.decisionRun;

            const user = await userModel.findById(item?.user);
            if (!user) return;

            let updatedWallet = user.wallet;

            if (runsMade >= item?.odd) {
                if (item?.side === "Back") {
                    updatedWallet += item?.profit;
                    await betModel.findByIdAndUpdate(item?._id, { status: "win" });
                } else {
                    updatedWallet += item?.exposure;
                    await betModel.findByIdAndUpdate(item?._id, { status: "loss" });
                }
            } else {
                if (item?.side === "Back") {
                    updatedWallet += item?.exposure;
                    await betModel.findByIdAndUpdate(item?._id, { status: "loss" });
                } else {
                    updatedWallet += item?.profit;
                    await betModel.findByIdAndUpdate(item?._id, { status: "win" });
                }
            }
            await userModel.findByIdAndUpdate(item?.user, { wallet: updatedWallet });
        })
    } catch (error) {
        console.error("Error in fn_declareFancyResult:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

module.exports = {
    fn_getExtraMarketsData,
    fn_getFancyResults,
    fn_declareFancyResult
};