const jwt = require("jsonwebtoken");
const betsModel = require("../Models/BetsModel");
const userModel = require("../Models/UserModel");
const BetDelayModel = require("../Models/BetDelayModel");
const adminModel = require("../Models/AdminModel");
const redis = require('redis');
const { default: mongoose } = require("mongoose");
const betsResultModel = require("../Models/BetsResultsModel");

const redisClient = redis.createClient({
    socket: {
        host: '62.72.57.126',
        port: 6379
    },
    password: 'NETREX2024@'
});

redisClient.connect().then().catch(err => console.error("Redis connection error:", err));

const createBets = async (req, res) => {
    try {
        const rawIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const clientIp = rawIp.includes('::ffff:') ? rawIp.split(':').pop() : rawIp;

        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded?.id || null;

        const bets = req.body.bets;
        if (!Array.isArray(bets) || bets.length === 0) {
            return res.status(400).json({ message: 'No bets provided' });
        }

        const user = await userModel.findById(userId).populate("master");
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        if (user?.disabled) {
            return res.status(400).json({ message: 'User disabled by Admin' });
        }
        if (!user?.master?.verified) {
            return res.status(400).json({ message: 'Account Disabled' });
        }
        if (!user?.master?.bets) {
            return res.status(400).json({ message: 'Bets Locked' });
        }
        if (user?.wallet < bets?.[0]?.stake || user?.wallet < bets?.[0]?.stake + Math.abs(user?.exposure)) {
            return res.status(400).json({ message: 'Insufficient Balance' });
        }

        // const totalBetAmount = bets.reduce((acc, bet) => acc + bet.amount, 0);

        // if (user.wallet < totalBetAmount) {
        //     return res.status(400).json({ message: 'Insufficient wallet balance' });
        // }
        const betDelay = await BetDelayModel.findOne({ admin: user.admin });
        const createBetsAfterDelay = async () => {
            // user.wallet -= totalBetAmount;
            // await user.save();

            const betsData = bets.map(bet => ({
                ...bet,
                user: userId,
                ipAddress: clientIp,
                admin: user.admin,
                master: user.master,
                selectionName: bet?.selectionName?.toLowerCase() || ""
            }));

            // const singleBet = bets?.[0];

            // let currentlyDataString = "";

            // if (!singleBet?.marketId.includes("-")) {
            //     currentlyDataString = await redisClient?.get(`ODDS_${singleBet?.marketId}`);
            // } else {
            //     const eId = singleBet?.eventId;
            //     currentlyDataString = await redisClient?.get(`d_${eId}`);
            // };

            // const currentlyData = JSON.parse(currentlyDataString);

            // if (singleBet?.marketId.includes("-")) {

            //     if (singleBet?.marketName?.toLowerCase()?.includes("bookmaker") || singleBet?.marketName == "Tied Match") {

            //         if (singleBet?.marketName == "bookmaker") {
            //             console.log("======= bookmaker ============");
            //             const sId = singleBet?.marketId?.split("-")?.[1];
            //             const recentBookmaketData = currentlyData?.data?.t2?.[0]?.bm1?.length > 0 ? currentlyData?.data?.t2?.[0]?.bm1 : currentlyData?.data?.t2?.[0]?.bm2;
            //             const bettedRecentBookmaketData = recentBookmaketData?.find((i) => i?.sid == sId);
            //             if (singleBet?.side === "Back") {
            //                 const BackOddsArray = [bettedRecentBookmaketData?.b1];
            //                 const findOdd = BackOddsArray?.find((od) => od == singleBet?.odd);
            //                 if (!findOdd) {
            //                     return res.status(400).json({ message: 'Odds Changed, bookmaker' });
            //                 }
            //             } else {
            //                 const LayOddsArray = [bettedRecentBookmaketData?.l1];
            //                 const findOdd = LayOddsArray?.find((od) => od == singleBet?.odd);
            //                 if (!findOdd) {
            //                     return res.status(400).json({ message: 'Odds Changed, bookmaker' });
            //                 }
            //             }
            //         } else if (singleBet?.marketName != "bookmaker" && singleBet?.marketName?.toLowerCase()?.includes("bookmaker")) {
            //             console.log("======= bookmaker extra ============");
            //             const sId = singleBet?.marketId?.split("-")?.[1];
            //             const dataArrayBookmaker = currentlyData?.data?.t2?.[1] || currentlyData?.data?.t2?.[2];
            //             const recentBookmaketData = dataArrayBookmaker?.bm1?.length > 0 ? dataArrayBookmaker?.bm1 : dataArrayBookmaker?.bm2;
            //             const bettedRecentBookmaketData = recentBookmaketData?.find((i) => i?.sid == sId);
            //             if (singleBet?.side === "Back") {
            //                 const BackOddsArray = [bettedRecentBookmaketData?.b1];
            //                 const findOdd = BackOddsArray?.find((od) => od == singleBet?.odd && bettedRecentBookmaketData?.s?.toLowerCase() == "active");
            //                 if (!findOdd) {
            //                     return res.status(400).json({ message: 'Odds Changed, extra bookmaker' });
            //                 }
            //             } else {
            //                 const LayOddsArray = [bettedRecentBookmaketData?.l1];
            //                 const findOdd = LayOddsArray?.find((od) => od == singleBet?.odd && bettedRecentBookmaketData?.s?.toLowerCase() == "active");
            //                 if (!findOdd) {
            //                     return res.status(400).json({ message: 'Odds Changed, extra bookmaker' });
            //                 }
            //             }
            //         } else if (singleBet?.marketName == "Tied Match") {
            //             console.log("======= bookmaker tied match ============");
            //             const sId = singleBet?.marketId?.split("-")?.[1];
            //             const dataArrayBookmaker = currentlyData?.data?.t2?.[2] || currentlyData?.data?.t2?.[1];
            //             const recentBookmaketData = dataArrayBookmaker?.bm1?.length > 0 ? dataArrayBookmaker?.bm1 : dataArrayBookmaker?.bm2;
            //             const bettedRecentBookmaketData = recentBookmaketData?.find((i) => i?.sid == sId);
            //             if (singleBet?.side === "Back") {
            //                 const BackOddsArray = [bettedRecentBookmaketData?.b1];
            //                 const findOdd = BackOddsArray?.find((od) => od == singleBet?.odd && bettedRecentBookmaketData?.s?.toLowerCase() == "active");
            //                 if (!findOdd) {
            //                     return res.status(400).json({ message: 'Odds Changed, tied match' });
            //                 }
            //             } else {
            //                 const LayOddsArray = [bettedRecentBookmaketData?.l1];
            //                 const findOdd = LayOddsArray?.find((od) => od == singleBet?.odd && bettedRecentBookmaketData?.s?.toLowerCase() == "active");
            //                 if (!findOdd) {
            //                     return res.status(400).json({ message: 'Odds Changed, tied match' });
            //                 }
            //             }
            //         }

            //     } else if (singleBet?.marketName == "fancy") {
            //         console.log("======= fancy ============");
            //         const sId = singleBet?.marketId?.split("-")?.[1];
            //         const fancyRecentMarket = currentlyData?.data?.t3?.find((fn) => fn?.sid == sId);
            //         const scoringSelectionName = singleBet?.selectionName?.split(" ");
            //         const score = scoringSelectionName?.[scoringSelectionName?.length - 1];
            //         if (singleBet?.side === "Back") {
            //             if (score != fancyRecentMarket?.b1) {
            //                 return res.status(400).json({ message: 'Odds Changed, fancy lay' });
            //             }
            //             if (fancyRecentMarket?.gstatus != "") {
            //                 return res.status(400).json({ message: 'Bet Timed out' });
            //             }
            //         } else {
            //             if (score != fancyRecentMarket?.l1) {
            //                 return res.status(400).json({ message: 'Odds Changed, fancy lay' });
            //             }
            //             if (fancyRecentMarket?.gstatus != "") {
            //                 return res.status(400).json({ message: 'Bet Timed out' });
            //             }
            //         }
            //     }

            // } else {
            //     const runner = currentlyData?.runners?.find((d) => d?.selectionId == singleBet?.gameId);
            //     const currentBets = singleBet?.side === "Back" ? runner?.ex?.availableToBack : runner?.ex?.availableToLay;
            //     const checkBetExists = currentBets?.find((b) => b?.price == singleBet?.odd && currentlyData?.status == "OPEN");
            //     if (!checkBetExists) {
            //         return res.status(400).json({ message: 'Odds Changed' });
            //     }
            // }

            await betsModel.insertMany(betsData);

            return res.status(200).json({ message: "Bets placed successfully", wallet: user.wallet });
        };
        if (betDelay && parseInt(betDelay.delayTime) > 0) {
            setTimeout(createBetsAfterDelay, parseInt(betDelay.delayTime));
        } else {
            await createBetsAfterDelay();
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAllBets = async (req, res) => {
    try {
        const bets = await betsModel.find();
        if (bets.length === 0) {
            return res.status(400).json({ message: "No Bet Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: bets });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllBetsByAdmin = async (req, res) => {
    try {
        const bets = await betsModel.find({ admin: req.adminId }).populate('user');
        if (bets.length === 0) {
            return res.status(400).json({ message: "No Bet Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: bets });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getOpenBetsByAdmin = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const adminId = decoded?.id || decoded?.adminId;

        const bets = await betsModel.find({ $or: [{ admin: req.adminId }, { master: req.adminId }], status: { $nin: ["win", "loss", "abandoned"] } }).populate(['user', 'master']).sort({ createdAt: -1 });
        if (bets.length === 0) {
            return res.status(400).json({ message: "No Bet Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: bets });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getCloseBetsByAdmin = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const adminId = decoded?.id || decoded?.adminId;

        const bets = await betsModel.find({ $or: [{ admin: req.adminId }, { master: req.adminId }], status: { $in: ["win", "loss", "abandoned"] } }).populate(['user', 'master']).sort({ createdAt: -1 });
        if (bets.length === 0) {
            return res.status(400).json({ message: "No Bet Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: bets });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllBetsByUser = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const admin = req.adminId;
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded?.id;

        const bets = await betsModel.find({ user: userId, admin });
        if (bets.length === 0) {
            return res.status(400).json({ message: "No Bet Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: bets });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllOpenBetsByUser = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded?.id;
        const admin = req.adminId;

        const bets = await betsModel.find({ user: userId, status: { $nin: ["win", "loss", "abandoned", "cashout"] }, admin }).sort({ createdAt: -1 });
        if (bets.length === 0) {
            return res.status(400).json({ message: "No Bet Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: bets });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateBets = async (req, res) => {
    try {
        const { sport, gameName, runner, side } = req.body;

        const bets = await betsModel.find({ sport, gameName });

        const winningBets = bets.filter(bet => bet.runner === runner && bet.side === side);
        const losingBets = bets.filter(bet => bet.runner !== runner || bet.side !== side);

        for (const bet of winningBets) {
            const user = await userModel.findById(bet.user);
            const commission = (bet.amount * bet.adminCommision) / 100;
            const winnings = bet.amount + bet.profit;
            const updatedWalletAmount = winnings - commission;
            user.wallet += updatedWalletAmount;
            await user.save();

            bet.status = "win";
            await bet.save();

            const admin = await adminModel.findById(bet.admin);
            admin.wallet += commission;
            await admin.save();
        }

        for (const bet of losingBets) {
            bet.status = "loss";
            await bet.save();
        }

        return res.status(200).json({ message: "Bets Updated" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const fn_getSuperAdminPendingBets = async (req, res) => {
    try {
        const { gameName, side, marketName } = req.query;

        const filter = { status: "pending" };
        if (gameName) {
            filter.gameName = { $regex: new RegExp(`^${gameName}$`, "i") };
        }
        if (side) {
            filter.side = { $regex: new RegExp(`^${side}$`, "i") };
        }
        if (marketName) {
            filter.marketName = { $regex: new RegExp(`^${marketName}$`, "i") };
        }

        const bets = await betsModel.find(filter).sort({ createdAt: -1 });

        const allPendingBets = await betsModel.find({ status: "pending" });

        const gameNameSet = new Set();
        const marketNameSet = new Set();

        allPendingBets.forEach(bet => {
            if (bet.gameName) {
                gameNameSet.add(bet.gameName.toLowerCase());
            }
            if (bet.marketName) {
                marketNameSet.add(bet.marketName.toLowerCase());
            }
        });

        const gameNames = Array.from(gameNameSet);
        const marketNames = Array.from(marketNameSet);

        return res.status(200).json({ data: bets, gameNames, marketNames });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!", error });
    }
};

const fn_updateBetResultsManually = async (req, res) => {
    try {
        const { ids, value } = req.body;

        if (!Array.isArray(ids) || !value || !['win', 'loss'].includes(value)) {
            return res.status(400).json({ message: "Invalid input." });
        }

        const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

        // Find the bets
        const bets = await betsModel.find({ _id: { $in: objectIds } });

        for (const bet of bets) {
            const user = await userModel.findById(bet?.user);

            if (!user) continue;

            if (value === 'win') {
                user.wallet += bet.profit;
            } else if (value === 'loss') {
                user.wallet += bet.exposure;
            }

            // Save updated user
            await user.save();

            // Update bet status
            bet.status = value;
            await bet.save();
        }

        return res.status(200).json({ message: "Bets and user wallets updated successfully." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!", error });
    }
};

const fn_processAutoBetResults = async () => {
    try {
        const allBets = await betsModel.find({ status: "pending" });

        for (const bet of allBets) {
            const { eventId, marketId, selectionName, user } = bet;

            const matchingResult = await betsResultModel.findOne({ eventId, marketId, runnerName: selectionName });
            if (!matchingResult) continue;

            if (matchingResult?.resultType === "auto") {
                const result = matchingResult.result;
                const foundUser = await userModel.findById(user);

                if (bet?.side === "Back") {
                    if (result === "win") {
                        foundUser.wallet += bet.profit;
                        bet.status = "win";
                    } else {
                        foundUser.wallet += bet.exposure;
                        bet.status = "loss";
                    }
                } else {
                    if (result === "win") {
                        foundUser.wallet += bet.exposure;
                        bet.status = "loss";
                    } else {
                        foundUser.wallet += bet.profit;
                        bet.status = "win";
                    }
                };
                await foundUser.save();
                await bet.save();

            } else if (matchingResult?.resultType === "custom") {
                const result = Number(matchingResult.result);
                const foundUser = await userModel.findById(user);
                if (!foundUser) continue;
                if (result >= bet?.odd) {
                    if (bet?.side === "Back") {
                        foundUser.wallet += bet.profit;
                        bet.status = "win";
                    } else {
                        foundUser.wallet += bet?.exposure;
                        bet.status = "loss";
                    }
                    await bet.save();
                    await foundUser.save();
                } else {
                    if (bet?.side === "Back") {
                        foundUser.wallet += bet?.exposure;
                        bet.status = "loss";
                    } else {
                        foundUser.wallet += bet?.profit;
                        bet.status = "win";
                    }
                    await bet.save();
                    await foundUser.save();
                }
            } else {
                return;
            }
        }

        console.log("All matching auto-result bets processed.");
    } catch (error) {
        console.error("Error processing auto results:", error);
    }
};

module.exports = {
    createBets,
    getAllBets,

    getAllBetsByAdmin,
    getOpenBetsByAdmin,
    getCloseBetsByAdmin,

    getAllBetsByUser,
    getAllOpenBetsByUser,
    fn_getSuperAdminPendingBets,

    updateBets,

    fn_processAutoBetResults,
    fn_updateBetResultsManually,
};