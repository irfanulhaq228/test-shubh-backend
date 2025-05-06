const betModel = require("../Models/BetsModel.js");
const betsResultModel = require("../Models/BetsResultsModel.js");

const createBetsResult = async (req, res) => {
    try {
        await betsResultModel.create(req.body);
        return res.status(200).json({ message: "Bets Result Created Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const betsReports = async (req, res) => {
    try {
        const admin = req.adminId;
        const bets = await betModel.find({ master: admin, status: { $in: ['win', 'loss'] } });

        const eventMap = {};

        bets?.forEach(bet => {
            const eventId = bet?.eventId;
            const gameName = bet?.gameName;

            if (!eventMap[eventId]) {
                eventMap[eventId] = {
                    eventId,
                    gameName,
                    totalProfit: 0,
                    totalBets: 0,
                    bets: []
                };
            };

            const masterProfit = bet.status === 'loss' ? bet.profit : -bet.profit;

            eventMap[eventId].totalProfit += masterProfit;
            eventMap[eventId].totalBets += 1;
            eventMap[eventId].bets.push({
                betId: bet._id,
                status: bet.status,
                user: bet.user,
                profit: bet.profit,
                exposure: bet.exposure
            });
        });

        const reportArray = Object.values(eventMap);

        return res.json({ report: reportArray });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};


module.exports = {
    createBetsResult,
    betsReports,
};