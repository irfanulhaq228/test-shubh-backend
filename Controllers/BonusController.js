const jwt = require("jsonwebtoken");
const bonusModel = require("../Models/BonusModel");
const staffModel = require("../Models/StaffModel");
const userModel = require("../Models/UserModel");
const adminModel = require("../Models/AdminModel");
const bonusLogModel = require("../Models/BonusLogs");
const betModel = require("../Models/BetsModel");

async function distributeBonuses() {
    const bonus = await bonusModel.findOne({ bonusType: 'older', status: 'active' });
    if (!bonus || !bonus.olderBonusRows?.length) return;

    const master = await staffModel.findOne(bonus.master)

    if (!master) {
        return res.status(404).json({
            status: 'fail',
            message: 'Master not found !!'
        })
    }

    console.log("master wallet = ",master.wallet)

    const users = await userModel.find({ master: bonus.master });
    const sortedBonusRows = bonus.olderBonusRows.sort((a, b) => a.bets - b.bets);

    console.log("sorted rows = ", sortedBonusRows)

    for (const user of users) {
        const betAggregation = await betModel.aggregate([
            { $match: { user: user._id } },
            { $group: { _id: "$user", count: { $sum: 1 } } }
        ]);
        const numberOfBets = betAggregation[0]?.count || 0;
        console.log("number of bets = ", numberOfBets)

        let matchedLevel = null;
        for (const row of sortedBonusRows) {
            if (numberOfBets >= parseInt(row.bets)) matchedLevel = row;
            else break;
        }

        console.log("matched level = ", matchedLevel)

        if (matchedLevel) {
            const level = parseInt(matchedLevel.bets);

            let log = await bonusLogModel.findOne({
                bonus: bonus._id,
                master: bonus.master,
                admin: bonus.admin,
                level
            });

            if (!log) {
                log = await bonusLogModel.create({
                    bonus: bonus._id,
                    master: bonus.master,
                    admin: bonus.admin,
                    level,
                    userArray: []
                });
            }

            const alreadyInLevel = log.userArray.some(entry => entry.user.toString() === user._id.toString());
            if (!alreadyInLevel) {
                const bonusAmount = (user.wallet * parseInt(matchedLevel.bonus)) / 100;

                console.log("bonus amount = ", bonusAmount)

                await userModel.updateOne({ _id: user._id }, {
                    $inc: { wallet: bonusAmount }
                });

                await staffModel.updateOne({ _id: master._id }, {
                    $inc: { wallet: -bonusAmount }
                });

                log.userArray.push({
                    user: user._id,
                    amount: bonusAmount
                });

                await log.save();
            }
        }
    }
}

const createBonus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        };

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(400).json({ message: 'Invalid Token' });
        };

        const id = decoded.adminId || decoded.merchantId || decoded.id;

        const master = await staffModel.findById(id);

        if (!master) {
            const admin = await adminModel.findById(id);
            const adminMaster = await staffModel.findOne({ admin: admin._id, type: 'main' });

            const bonus = await bonusModel.create({ ...req.body, master: adminMaster._id, admin: adminMaster.admin });
            return res.status(200).json({ message: "Bonus added successfully", data: bonus });
        } else {
            if (!master.verified) return res.status(400).json({ message: 'Master Not Available' });

            const bonus = await bonusModel.create({ ...req.body, master: id, admin: master.admin });

            if (bonus.bonusType === "refill") {
                const master = await staffModel.findById(bonus.master)
                let totalAmount = 0;

                if (bonus.selectedUser) {

                    console.log('----selected user updating----')
                    const userId = bonus.selectedUser
                    const user = await userModel.findById(userId)

                    totalAmount = bonus.amount

                    user.wallet += totalAmount

                    master.wallet -= totalAmount

                    await master.save()

                    await user.save()

                    await bonusLogModel.create({
                        bonus: bonus._id,
                        master: bonus.master,
                        admin: bonus.admin,
                        user: user,
                        totalBonusAmount: totalAmount
                    })

                } else {

                    console.log('----multiple user(s) updating----')
                    const allUser = await userModel.find({ master: bonus.master })

                    if (!allUser || allUser.length === 0) {
                        console.log("no user found!!")
                    }

                    const bonusAmount = bonus.amount

                    await userModel.updateMany(
                        { master: bonus.master },
                        { $inc: { wallet: bonusAmount } }
                    );

                    totalAmount = bonusAmount * allUser.length

                    master.wallet -= totalAmount

                    await master.save()

                    await bonusLogModel.create({
                        bonus: bonus._id,
                        master: bonus.master,
                        admin: bonus.admin,
                        refillUserArray: allUser.map(u => u._id),
                        totalBonusAmount: totalAmount
                    })

                }
            }

            return res.status(200).json({ message: "Bonus added successfully", data: bonus });
        };
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getByMaster = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        };

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(400).json({ message: 'Invalid Token' });
        };

        const id = decoded.adminId || decoded.merchantId || decoded.id;

        const master = await staffModel.findById(id);

        if (!master) {
            const data = await bonusModel.find({ admin: id }).sort({ createdAt: -1 }).populate(["selectedUser", "master"]);
            if (data?.length === 0) {
                return res.status(400).json({ message: 'No Bonus Found' });
            };
            return res.status(200).json({ message: "Bonus fetched Successfully", data: data });
        } else {
            const data = await bonusModel.find({ master: id }).sort({ createdAt: -1 }).populate(["selectedUser", "master"]);
            if (data?.length === 0) {
                return res.status(400).json({ message: 'No Bonus Found' });
            };
            return res.status(200).json({ message: "Bonus fetched Successfully", data: data });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getByUser = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        };

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(400).json({ message: 'Invalid Token' });
        };

        const id = decoded.adminId || decoded.masterId || decoded.id;
        console.log(id);

        const user = await userModel.findById(id);
        if (!user || user.disabled) return res.status(400).json({ message: 'User Not Available' });

        const data = await bonusModel.find({ user: id }).sort({ createdAt: -1 });
        if (data?.length === 0) {
            return res.status(400).json({ message: 'No Bonus Found' });
        }
        return res.status(200).json({ message: "Bonus fetched Successfully", data: data });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const updateBonus = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        };

        const { id } = req.params;

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(400).json({ message: 'Invalid Token' });
        };

        const bonus = await bonusModel.findByIdAndUpdate(id, req.body);
        return res.status(200).json({ message: "Bonus Updated", data: bonus });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createBonus,
    getByMaster,
    getByUser,
    updateBonus,
    distributeBonuses
};