const jwt = require("jsonwebtoken");
const bankModel = require("../Models/BankModel.js");
const staffModel = require("../Models/StaffModel.js");
const userModel = require("../Models/UserModel.js");

const createBank = async (req, res) => {
    try {
        const { type } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        let userId = decoded?.id || null;
        let adminId = decoded?.adminId || req.body.admin || null;
        let masterId = null;

        if (type === 'admin' && decoded?.adminId) {
            const staff = await staffModel.findOne({ admin: decoded.adminId, type: "main" });
            if (!staff) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            masterId = staff._id;
        } else if (type === 'master') {
            masterId = req.adminId;
            const master = await staffModel.findById(masterId);
            if (master) {
                adminId = master.admin;
            }
        }

        // Handle image upload
        let imageUrl = req.file ? req.file.path : null;

        const bankData = {
            ...req.body,
            userId,
            adminId,
            masterId,
            image: imageUrl
        };

        const bank = new bankModel(bankData);
        await bank.save();

        return res.status(200).json({ message: "Bank added successfully", data: bank });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAllBanks = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded?.id || null;
        const adminId = decoded?.adminId || null;
        const banks = await bankModel.find({
            userId: userId,
            adminId: adminId
        });
        if (banks.length === 0) {
            return res.status(400).json({ message: "Bank Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: banks });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getBanks = async (req, res) => {
    try {
        const banks = await bankModel.find();
        if (banks.length === 0) {
            return res.status(400).json({ message: "Bank Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: banks });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAdminsBank = async (req, res) => {
    try {
        const banks = await bankModel.find({ $or: [{ adminId: req.adminId }, { masterId: req.adminId }], userId: null }).populate(["masterId"]);
        if (banks.length === 0) {
            return res.status(400).json({ message: "Bank Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: banks });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAdminsActiveBank = async (req, res) => {
    try {
        const banks = await bankModel.find({ userId: null, status: true });
        if (banks.length === 0) {
            return res.status(400).json({ message: "Bank Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: banks });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllActiveBanks = async (req, res) => {
    try {
        const id = req.adminId;
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded?.id;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(400).json({ message: "No User Found" })
        };
        const banks = await bankModel.find({ status: true, adminId: id, masterId: user.master });
        if (banks.length === 0) {
            return res.status(400).json({ message: "Bank Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: banks });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteBank = async (req, res) => {
    try {
        const { id } = req.params;
        const bank = await bankModel.findByIdAndDelete(id);
        if (bank) {
            return res.status(200).json({ message: "Bank Deleted Successfully" });
        }
        return res.status(400).json({ message: "Wrong Bank Id" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateBank = async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = { ...req.body };

        if (req.file) {
            updateData.image = req.file.path;
        }

        await bankModel.findByIdAndUpdate(id, updateData, { new: true });
        return res.status(200).json({ message: "Bank Updated" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createBank,
    getAllBanks,
    getAllActiveBanks,
    deleteBank,
    updateBank,
    getBanks,
    getAdminsBank,
    getAdminsActiveBank
};