const jwt = require("jsonwebtoken");
const bonusLogModel = require("../Models/BonusLogs");
const mongoose = require("mongoose")

const getAllBonusLog = async (req, res) => {
    try {
        const allLogs = await bonusLogModel.find({}).populate('user', 'bonus')

        if (allLogs === 0 || !allLogs) {
            return res.status(404).json({ status: 'fail', message: 'No Logs Found' })
        }

        return res.status(200).json({ status: 'ok', message: 'All logs fetched successfully', data: allLogs })
    } catch (error) {
        return res.status(500).json({ status: 'fail', message: 'Internal Server Error !!' })
    }

}

const masterLogs = async (req, res) => {
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

        const logs = await bonusLogModel.find({ master: id })

        if (logs === 0 || !logs) {
            return res.status(401).json({ status: 'fail', message: 'Logs not found' })
        }

        return res.status(200).json({ status: 'ok', message: 'bonus logs for master fetched successfully' })
    } catch (error) {
        return res.status(500).json({ status: 'fail', message: 'internal server error !!' })
    }
}


const userLogs = async (req, res) => {
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
        const userObjectId = new mongoose.Types.ObjectId(id);

        console.log("user id = ", id)

        const joiningLog = await bonusLogModel.find({
            user: userObjectId
        }).populate('bonus')

        const olderLog = await bonusLogModel.aggregate([
            {
                $match: {
                    'userArray.user': userObjectId
                }
            },
            {
                $addFields: {
                    userArray: {
                        $filter: {
                            input: '$userArray',
                            as: 'item',
                            cond: { $eq: ['$$item.user', userObjectId] }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'bonuses', // name of the Bonus collection
                    localField: 'bonus',
                    foreignField: '_id',
                    as: 'bonus'
                }
            },
            {
                $unwind: {
                    path: '$bonus',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        const refillLog = await bonusLogModel.find({
            refillUserArray: userObjectId
        }).populate('bonus')

        return res.status(200).json({
            status: 'ok',
            message: 'logs fetched successfully',
            data: {
                joiningLog,
                olderLog,
                refillLog
            }
        })

    } catch (error) {
        console.error("User logs error: ", error)
        return res.status(500).json({ status: 'fail', message: 'internal server error !!' })
    }
}


const adminLogs = async (req, res) => {
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

        const logs = await bonusLogModel.find({ admin: id })

        if (logs === 0 || !logs) {
            return res.status(401).json({ status: 'fail', message: 'Logs not found' })
        }

        return res.status(200).json({ status: 'ok', message: 'bonus logs for admin fetched successfully' })
    } catch (error) {
        return res.status(500).json({ status: 'fail', message: 'internal server error !!' })
    }
}
module.exports = {
    getAllBonusLog,
    adminLogs,
    userLogs,
    masterLogs
}