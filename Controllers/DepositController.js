const bankModel = require("../Models/BankModel.js");
const depositModel = require("../Models/DepositModel.js");
const userModel = require("../Models/UserModel.js");
const LedgerModel = require("../Models/LedgerModel.js");
const adminModel = require("../Models/AdminModel.js");

const jwt = require("jsonwebtoken");

const sendCustomNotification = require("../firebase.js");
const staffModel = require("../Models/StaffModel.js");

const createDeposit = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const id = jwt.verify(token, process.env.SECRET_KEY);
        const userId = id?.id;
        const { bankId } = req.body;
        const image = req.file;
        const user = await userModel.findById(userId);
        const admin = await adminModel.findById(req.adminId);
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
            receipt: image.path,
            transactionId: req.body.transactionId,
            status: "pending"
        }
        const response = new depositModel(data);
        await response.save();
        // console.log("fcm token ==> ", admin.fcmTokens);
        // await sendCustomNotification('New Deposit Request', `You got a deposit request of ₹${req.body.amount}`, admin?.fcmTokens);
        return res.status(200).json({ message: "Deposit Request Sent Successfully", data: response });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllDeposits = async (req, res) => {
    try {
        const deposits = await depositModel.find();
        if (deposits.length === 0) {
            return res.status(400).json({ message: "No Deposit Occurs" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: deposits });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getDepositById = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const admin = req.adminId;
        const id = jwt.verify(token, process.env.SECRET_KEY);
        const userId = id?.id;
        const deposit = await depositModel.find({ user: userId, admin }).populate('bank');
        if (!deposit) {
            return res.status(400).json({ message: "No Deposit Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: deposit });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getDepositByAdminId = async (req, res) => {
    try {
        const deposit = await depositModel.find({ $or: [{ admin: req.adminId }, { master: req.adminId }] }).populate('bank').populate('user').populate('master');
        if (deposit?.length === 0) {
            return res.status(400).json({ message: "No Deposit Found" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: deposit });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const deposit = await depositModel.findByIdAndDelete(id);
        if (deposit) {
            return res.status(200).json({ message: "Deposit Deleted Successfully" });
        }
        return res.status(400).json({ message: "Wrong Deposit Id" })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateStatus = async (req, res) => {
    try {
        const { value } = req.body;
        const { id } = req.params;
        const deposit = await depositModel.findById(id);
        if (!deposit) {
            return res.status(404).json({ message: "Deposit not found" });
        };
        const currentStatus = deposit.status;
        const amount = deposit.amount;
        const user = await userModel.findById(deposit.user);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        };
        // console.log("fcm token ==> ", user.fcmTokens);
        if (value === "decline") {
            deposit.status = value;
            // await sendCustomNotification('Deposit Declined ❌', `Your Deposit of ₹${amount} is Declined`, user?.fcmTokens);
        } else if (value === "approved" && currentStatus !== "approved") {
            const staff = await staffModel.findById(user.master);
            if (!staff || staff.wallet < amount) {
                return res.status(400).json({ message: "Insufficient Balance in Wallet" });
            };
            user.wallet += amount;
            await staffModel.findByIdAndUpdate(user.master, { $inc: { wallet: -amount } }, { new: true });
            deposit.status = value;
            // await sendCustomNotification('Deposit Approved ✅', `Your Deposit of ₹${amount} is Approved`, user?.fcmTokens);
        };
        await deposit.save();
        await user.save();

        return res.status(200).json({ message: "Deposit Updated", deposit });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = { updateStatus };


module.exports = {
    createDeposit,
    getAllDeposits,
    getDepositById,
    deleteDeposit,
    updateStatus,
    getDepositByAdminId
};