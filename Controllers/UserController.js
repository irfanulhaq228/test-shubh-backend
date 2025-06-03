const ip = require('ip');
const geoip = require('geoip-lite');
const jwt = require("jsonwebtoken");

var getIP = require('ipware')().get_ip;
const { lookup } = require('geoip-lite');

const betModel = require("../Models/BetsModel.js");
const userModel = require("../Models/UserModel.js");
const adminModel = require("../Models/AdminModel.js");
const depositModel = require("../Models/DepositModel.js");
const withdrawModel = require("../Models/WithdrawModel.js");
const staffModel = require('../Models/StaffModel.js');

// var getIP = require('ipware')().get_ip;
// const { lookup } = require('geoip-lite');

const createUser = async (req, res) => {
    try {
        const admin = req.adminId;
        const { phone, username, fcmToken, type } = req.body;

        let master = await staffModel.findById(admin);
        if (!master) {
            const m = await staffModel.findOne({ type: "main", admin: admin });
            master = m;
        }

        const existingUser = await userModel.findOne({ $or: [{ phone, admin: master?.admin }, { username, admin: master.admin }] });
        if (existingUser) {
            if (existingUser.phone === phone) {
                return res.status(409).json({ message: "Phone Number already exists" });
            }
            if (existingUser.username === username) {
                return res.status(409).json({ message: "Username already exists" });
            }
        }

        var ipInfo = getIP(req);
        const look = lookup(ipInfo?.clientIp);
        let ipAddress = ipInfo.clientIp;

        if (ipAddress.startsWith('::ffff:')) {
            ipAddress = ipAddress.replace('::ffff:', '');
        }

        const loginDetails = {
            loginDateTime: new Date(),
            ipAddress: ipAddress,
            isp: 'Unknown ISP',
            city: look?.city || 'Unknown City',
            state: look?.region || 'Unknown State',
            country: look?.country || 'Unknown Country'
        };
        let masterId = master?._id;
        if (type === "admin") {
            const master = await staffModel.findOne({ type: "main", admin: admin });
            masterId = master._id;
            req.body.firstTime = true;
        } else if (type === "master") {
            req.body.firstTime = true;
        }

        const user = new userModel({ ...req.body, loginDetails: [loginDetails], admin: master.admin, fcmTokens: fcmToken, master: masterId });
        await user.save();

        const id = user._id;
        const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });

        const adminUser = await adminModel.findById(user.admin);
        const masterUser = await staffModel.findOne({ admin: user.admin, type: "main" });

        return res.status(200).json({
            message: "User created successfully", token, data: {
                ...user.toObject(),
                oddRate: adminUser.oddRate || 0,
                phone: masterUser?.phone || null,
                oddRateType: adminUser.oddRateType || "percentage",
                bookmakerRate: adminUser.bookmakerRate || 0,
                bookmakerRateType: adminUser.bookmakerRateType || "percentage",
                fancyRate: adminUser.fancyRate || 0,
                fancyRateType: adminUser.fancyRateType || "number",
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { username, password, fcmToken } = req.body;
        const admin = req.adminId;
        const user = await userModel.findOne({ username, admin }).populate("master");
        if (!user) {
            return res.status(401).json({ message: "Incorrect Username or Password" });
        }
        if (user?.password !== password) {
            return res.status(401).json({ message: "Incorrect Username or Password" });
        }
        if (user?.disabled) {
            return res.status(401).json({ message: "You are disabled by Admin" });
        }
        if (!user?.master?.verified) {
            return res.status(401).json({ message: "Account Disabled" });
        }
        if (user?.firstTime) {
            return res.status(200).json({ message: "User Verified", firstTime: user?.firstTime, id: user?._id });
        }

        var ipInfo = getIP(req);
        const look = lookup(ipInfo?.clientIp);
        let ipAddress = ipInfo.clientIp;

        if (ipAddress.startsWith('::ffff:')) {
            ipAddress = ipAddress.replace('::ffff:', '');
        }

        const loginDetails = {
            loginDateTime: new Date(),
            ipAddress: ipAddress,
            isp: 'Unknown ISP',
            city: look?.city || 'Unknown City',
            state: look?.region || 'Unknown State',
            country: look?.country || 'Unknown Country'
        };

        user.loginDetails.push(loginDetails);
        if (fcmToken) {
            user.fcmTokens = fcmToken;
        }
        await user.save();

        const id = user?._id;
        const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });

        const adminUser = await adminModel.findById(user.admin);
        const masterUser = await staffModel.findOne({ admin: user.admin, type: "main" });
        const staffUser = await staffModel.findById(user.master);

        return res.status(200).json({
            message: "User logged in successfully",
            token,
            data: {
                ...user.toObject(),
                oddRate: adminUser.oddRate || 0,
                phone: staffUser?.phone || masterUser?.phone || null,
                oddRateType: adminUser.oddRateType || "percentage",
                bookmakerRate: adminUser.bookmakerRate || 0,
                bookmakerRateType: adminUser.bookmakerRateType || "percentage",
                fancyRate: adminUser.fancyRate || 0,
                fancyRateType: adminUser.fancyRateType || "number",
                enableBanks: staffUser?.enableBanks
            },
            firstTime: user?.firstTime
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const user = await userModel.find({ $or: [{ admin: req.adminId }, { master: req.adminId }] }).populate(["master"]);
        if (user.length === 0) {
            return res.status(400).json({ message: "User Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: user });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.findByIdAndDelete(id);
        if (user) {
            return res.status(200).json({ message: "User Deleted Successfully" });
        }
        return res.status(400).json({ message: "Wrong User Id" })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateStatus = async (req, res) => {
    try {
        const { value } = req.body;
        const { id } = req.params;
        await userModel.findByIdAndUpdate(id, { disabled: value });
        return res.status(200).json({ message: "User Updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const checkUser = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        await jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Failed to authenticate token' });
            }
            const user = await userModel.findById(decoded.id).select('-password').populate("master");
            if (user.disabled) {
                return res.status(400).json({ message: "Failed" });
            }
            if (!user.master?.verified) {
                return res.status(400).json({ message: "Failed due to master blocked" });
            }
            const adminUser = await adminModel.findById(user.admin);
            const masterUser = await staffModel.findOne({ admin: user.admin, type: "main" });
            const staffUser = await staffModel.findById(user.master);
            // fetch bets data
            // const userBets = await betModel.find({ user: decoded.id });
            // const winBets = userBets.filter((item => item?.status === "win"));
            // const lossBets = userBets.filter((item => item?.status === "loss"));
            // const continueBets = userBets.filter((item => item?.status === "pending"));
            // deposit/withdraw data fetch
            // const totalDeposit = (await depositModel.find({ user: decoded.id, status: "approved" })).reduce((acc, item) => { return item?.amount + acc }, 0);
            // const totalWithdraw = (await withdrawModel.find({ user: decoded.id, status: "approved" })).reduce((acc, item) => { return item?.amount + acc }, 0);
            // const totalEarning = winBets.reduce((acc, item) => { return item?.amount + acc }, 0);

            return res.status(200).json({
                message: "Checked",
                wallet: user?.wallet,
                phone: staffUser?.phone || masterUser?.phone || null,
                username: user?.username,
                enableBanks: staffUser?.enableBanks,
                user: {
                    ...user.toObject(),
                    oddRate: adminUser.oddRate || 0,
                    oddRateType: adminUser.oddRateType || "percentage",
                    bookmakerRate: adminUser.bookmakerRate || 0,
                    bookmakerRateType: adminUser.bookmakerRateType || "percentage",
                    fancyRate: adminUser.fancyRate || 0,
                    fancyRateType: adminUser.fancyRateType || "number"
                }
                // totalBets: userBets?.length,
                // winShots: winBets?.length,
                // lossesShots: lossBets?.length,
                // continueBets: continueBets?.length,
                // totalDeposit: totalDeposit,
                // totalWithdraw: totalWithdraw,
                // totalEarning: totalEarning
            });

        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const userDataForDashboard = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        await jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Failed to authenticate token' });
            }
            const user = await userModel.findById(decoded.id);
            if (user.disabled) {
                return res.status(400).json({ message: "Failed" });
            }
            // fetch bets data
            const userBets = await betModel.find({ user: decoded.id });
            const winBets = userBets?.filter((item => item?.status === "win"));
            const lossBets = userBets?.filter((item => item?.status === "loss"));
            const continueBets = userBets?.filter((item => item?.status === "pending"));
            // deposit/withdraw data fetch
            const totalDeposit = (await depositModel.find({ user: decoded.id, status: "approved" })).reduce((acc, item) => { return item?.amount + acc }, 0);
            const totalWithdraw = (await withdrawModel.find({ user: decoded.id, status: "approved" })).reduce((acc, item) => { return item?.amount + acc }, 0);
            const totalEarning = winBets.reduce((acc, item) => { return item?.amount + acc }, 0);

            return res.status(200).json({
                message: "Checked",
                wallet: user?.wallet,
                username: user?.username,
                totalBets: userBets?.length,
                winShots: winBets?.length,
                lossesShots: lossBets?.length,
                continueBets: continueBets?.length,
                totalDeposit: totalDeposit,
                totalWithdraw: totalWithdraw,
                totalEarning: totalEarning
            });

        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const userApprovalAmount = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        await jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Failed to authenticate token' });
            }
            const user = await userModel.findById(decoded.id);
            if (!user) return res.status(400).json({ message: "Failed" });
            if (user.disabled) {
                return res.status(400).json({ message: "Failed" });
            }
            const totalDepositForApproval = (await depositModel.find({ user: decoded.id, status: "pending" })).reduce((acc, item) => { return item?.amount + acc }, 0);
            const totalWithdrawForApproval = (await withdrawModel.find({ user: decoded.id, status: "pending" })).reduce((acc, item) => { return item?.amount + acc }, 0);

            return res.status(200).json({
                message: "Checked",
                totalDepositForApproval,
                totalWithdrawForApproval
            });

        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const userLoginDetails = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        await jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Failed to authenticate token' });
            }
            const user = await userModel.findById(decoded.id);
            if (user.disabled) {
                return res.status(400).json({ message: "Failed" });
            }

            const sortedLoginDetails = user.loginDetails.sort((a, b) => new Date(b.loginDateTime) - new Date(a.loginDateTime));

            return res.status(200).json({ message: "Login Details fetched successfully", data: sortedLoginDetails });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const checkAdminOfUsers = async (req, res) => {
    try {
        const id = req.adminId;
        const admin = await adminModel.findById(id);
        if (!admin) {
            return res.status(400).json({ message: "Failed" });
        }
        if (!admin?.verified) {
            return res.status(400).json({ message: "Failed" });
        }
        return res.status(200).json({ message: "Success" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getUserInfo = async (req, res) => {
    try {
        const userId = req.params;
        const user = await userModel.findById(userId.id).populate(["master"]);

        if (!user) {
            return res.status(400).json({ message: "Failed" });
        }

        const userBets = await betModel.find({ user: userId.id });
        const totalBets = userBets.length || 0;
        const winBets = userBets.filter((b) => b.status === "win").length || 0;
        const lossBets = userBets.filter((b) => b.status === "loss").length || 0;
        const runningBets = userBets.filter((b) => b.status !== "loss" && b.status !== "win").length || 0;

        const winPercentage = totalBets ? (winBets / totalBets) * 100 : 0;
        const lossPercentage = totalBets ? (lossBets / totalBets) * 100 : 0;

        let mostResult;
        if (winPercentage > lossPercentage) {
            mostResult = "win";
        } else if (lossPercentage > winPercentage) {
            mostResult = "loss";
        } else {
            mostResult = "equal";
        }

        const userDeposit = await depositModel.find({ user: userId.id, status: "approved" });
        const totalDeposit = userDeposit?.reduce((acc, i) => {
            return acc + i?.amount
        }, 0) || 0;

        const userWithdraw = await withdrawModel.find({ user: userId.id, status: "approved" });
        const totalWithdraw = userWithdraw?.reduce((acc, i) => {
            return acc + i?.amount
        }, 0) || 0;

        const userObj = user.toObject();

        return res.status(200).json({
            message: "Success",
            data: {
                ...userObj,
                totalBets,
                winBets,
                lossBets,
                runningBets,
                winPercentage: winPercentage.toFixed(2),
                lossPercentage: lossPercentage.toFixed(2),
                mostResult,
                totalDeposit,
                totalWithdraw
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const updateUser = async (req, res) => {
    const updates = req.body;
    const { userId, type } = req.query;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token && !userId) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userIdToUpdate = userId || decoded.id;

        if (updates.wallet) {
            const user = await userModel.findById(userIdToUpdate);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            let walletHolder;

            if (type === 'admin') {
                walletHolder = await adminModel.findById(user.admin);
            } else if (type === 'master') {
                walletHolder = await staffModel.findById(user.master);
            } else {
                return res.status(400).json({ message: 'Invalid type' });
            }

            if (!walletHolder || walletHolder.wallet < updates.wallet) {
                return res.status(400).json({ message: 'Insufficient Balance in Wallet' });
            }

            await walletHolder.updateOne({ $inc: { wallet: -updates.wallet } });

            updates.wallet = user.wallet + updates.wallet;
        }

        const updatedUser = await userModel.findByIdAndUpdate(userIdToUpdate, updates, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (updatedUser.disabled) {
            return res.status(400).json({ message: 'Failed' });
        }

        return res.status(200).json({ message: 'Update successfully', data: updatedUser });

    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: 'Failed to authenticate token' });
    }
};

const withdrawPointByAdmin = async (req, res) => {
    const { userId } = req.query;
    const { value } = req.body;
    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.wallet < value) {
            return res.status(400).json({ message: 'Insufficient balance in wallet' });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $inc: { wallet: -value } },
            { new: true }
        );

        return res.status(200).json({ message: 'Update successfully', data: updatedUser });

    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: 'Failed to authenticate token' });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.password = newPassword;
        user.firstTime = false;
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '30d' });

        const adminUser = await adminModel.findById(user.admin);
        const masterUser = await staffModel.findOne({ admin: user.admin, type: "main" });

        return res.status(200).json({
            message: "Password updated successfully",
            token,
            data: {
                ...user.toObject(),
                oddRate: adminUser.oddRate || 0,
                phone: masterUser?.phone || null,
                oddRateType: adminUser.oddRateType || "percentage",
                bookmakerRate: adminUser.bookmakerRate || 0,
                bookmakerRateType: adminUser.bookmakerRateType || "percentage",
                fancyRate: adminUser.fancyRate || 0,
                fancyRateType: adminUser.fancyRateType || "number",
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const creditTrnsactionAPI = async (req, res) => {
    try {
        const creditTrn = Number(req.body.creditTransaction)
        const sign = req.body.sign;

        const id = req.params.id;

        console.log("user id = ", id)

        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'Id not found !!' })
        }

        if (!creditTrn || !sign) {
            return res.status(401).json({ status: 'fail', message: 'All fields are required !!' })
        }

        const user = await userModel.findById(id)

        console.log("user wallet before CR = ", user.wallet)
        console.log("user CR before CR = ", user.creditTransaction)

        if (!staff) {
            return res.status(400).json({ status: 'fail', message: 'Id incorrect, user not found !!' })
        }

        if (sign === "-") {
            if (user.creditTransaction - creditTrn < 0) {
                return res.status(403).json({ status: 'fail', message: 'Credit Reference cannot go beyond 0 !!' })
            }
            user.creditTransaction = user.creditTransaction - creditTrn;
        }

        if (sign === "+") {
            user.creditTransaction += creditTrn,
            user.wallet += creditTrn
        }

        await user.save();

        console.log("user wallet after CR = ", user.wallet)
        console.log("user CR after CR = ", user.creditTransaction)

        return res.status(200).json({ status: 'ok', message: 'Credit transaction updated successfully' })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ status: 'fail', message: 'internal server error !!' })
    }
}


module.exports = {
    createUser,
    loginUser,
    getAllUsers,
    deleteUser,
    updateStatus,
    checkUser,
    userDataForDashboard,
    userApprovalAmount,
    userLoginDetails,
    checkAdminOfUsers,
    getUserInfo,
    updateUser,
    updatePassword,
    withdrawPointByAdmin,
    creditTrnsactionAPI
};