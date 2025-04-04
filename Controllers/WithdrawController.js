const bankModel = require("../Models/BankModel.js");
const withdrawModel = require("../Models/WithdrawModel.js");
const userModel = require("../Models/UserModel.js");
const LedgerModel = require("../Models/LedgerModel.js");
const adminModel = require("../Models/AdminModel.js");

const jwt = require("jsonwebtoken");

const sendCustomNotification = require("../firebase.js");

const createWithdraw = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const id = jwt.verify(token, process.env.SECRET_KEY);
        const userId = id?.id;
        const { bankId } = req.body;
        const user = await userModel.findById(userId);
        // const admin = await adminModel.findById(req.adminId);
        if (!user) return res.status(400).json({ message: "User doesnot Exist" });
        if (user?.disabled) return res.status(400).json({ message: "User disabled by Admin" });
        const bank = await bankModel.findById(bankId);
        if (!bank) return res.status(400).json({ message: "Bank not Found" });
        if (!bank?.status) return res.status(400).json({ message: "Bank is Disabled" });
        const data = {
            user: userId,
            bank: bankId,
            amount: req.body.amount,
            admin: user.admin,
            master: user.master,
            status: "pending"
        }
        user.wallet -= req.body.amount;
        const response = new withdrawModel(data);
        await response.save();
        await user.save();
        // await sendCustomNotification('New Withdraw Request', `You got a withdraw request of ₹${req.body.amount}`, admin?.fcmTokens);
        return res.status(200).json({ message: "Withdraw Request Sent Successfully", data: response });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllWithdraws = async (req, res) => {
    try {
        const withdraws = await withdrawModel.find().populate('bank').populate('user').populate('admin');
        if (withdraws.length === 0) {
            return res.status(400).json({ message: "No Withdraw Occurs" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: withdraws });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getWithdrawById = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const id = jwt.verify(token, process.env.SECRET_KEY);
        const userId = id?.id;
        const admin = req.adminId;
        const withdraw = await withdrawModel.find({ user: userId, admin }).populate('bank').populate('user');
        if (!withdraw) {
            return res.status(400).json({ message: "No Withdraw Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: withdraw });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getWithdrawByAdminId = async (req, res) => {
    try {
        const withdraw = await withdrawModel.find({ $or: [{ admin: req.adminId }, { master: req.adminId }] }).populate('bank').populate('user').populate('master');
        if (withdraw?.length === 0) {
            return res.status(400).json({ message: "No withdraw Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: withdraw });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateStatus = async (req, res) => {
    try {
        const { value } = req.body;
        const { id } = req.params;
        const withdraw = await withdrawModel.findById(id);

        if (!withdraw) {
            return res.status(400).json({ message: "Withdraw not found" });
        }

        const currentStatus = withdraw.status;
        const amount = withdraw.amount;
        withdraw.status = value;

        const user = await userModel.findById(withdraw.user);
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        if ((currentStatus === "approved" && value === "pending") || (currentStatus === "approved" && value === "decline")) {
            user.wallet += amount;
        } else if (value === "approved" && currentStatus !== "approved") {
            const checkBalance = user?.wallet > amount ? true : false;
            if (!checkBalance) {
                return res.status(400).json({ message: "Don't have enough amount" });
            }
        } else if (value === "decline") {
            user.wallet += amount;
        }

        await withdraw.save();
        await user.save();
        // if (value === "approved") {
        //     await sendCustomNotification('Withdraw Approved ✅', `Your Withdraw of ₹${amount} is Approved`, user?.fcmTokens);
        // } else if (value === "decline") {
        //     await sendCustomNotification('Withdraw Declined ❌', `Your Withdraw of ₹${amount} is Declined`, user?.fcmTokens);
        // }
        return res.status(200).json({ message: "Withdraw Updated", data: withdraw });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createWithdraw,
    getAllWithdraws,
    getWithdrawById,
    updateStatus,
    getWithdrawByAdminId,
};