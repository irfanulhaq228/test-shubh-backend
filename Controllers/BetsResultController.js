const betsResultModel = require("../Models/BetsResultsModel.js");

const createBetsResult = async (req, res) => {
    try {
        await betsResultModel.create(req.body);
        return res.status(200).json({ message: "Bets Result Created Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

module.exports = {
    createBetsResult,
};