const jwt = require("jsonwebtoken");

const staffModel = require('../Models/StaffModel.js');
const adminModel = require("../Models/AdminModel.js");

const createStaff = async (req, res) => {
    try {
        const adminId = req.adminId;
        const { email, wallet, type } = req.body;

        const existingStaff = await staffModel.findOne({ email });
        if (existingStaff) {
            return res.status(400).json({ message: "Email Already Exists" });
        }

        const admin = await adminModel.findById(adminId);
        if (!admin || admin.wallet < wallet) {
            return res.status(400).json({ message: "Insufficient Balance in Admin Wallet" });
        }

        await adminModel.findByIdAndUpdate(adminId, { $inc: { wallet: -wallet } });

        let validate = null;
        validate = Math.floor(100000 + Math.random() * 900000).toString();

        const staff = new staffModel({ ...req.body, admin: adminId, firstTime: true, validate });
        await staff.save();

        const token = jwt.sign({ id: staff._id }, process.env.SECRET_KEY, { expiresIn: '30d' });

        return res.status(200).json({ message: "Master created successfully", token, data: staff });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const loginStaff = async (req, res) => {
    try {
        const { email, password } = req.body;
        const staff = await staffModel.findOne({ email });
        if (!staff) {
            return res.status(401).json({ message: "Incorrect Email or Password" });
        }
        if (staff?.password !== password) {
            return res.status(401).json({ message: "Incorrect Phone Number or Password" });
        }

        const id = staff?._id;
        const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });
        return res.status(200).json({ message: "Master logged in successfully", token, data: staff });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAllStaffs = async (req, res) => {
    try {
        const staffs = await staffModel.find({ admin: req.adminId });
        if (staffs.length === 0) {
            return res.status(400).json({ message: "Master Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: staffs });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await staffModel.findByIdAndDelete(id);
        if (staff) {
            return res.status(200).json({ message: "Master Deleted Successfully" });
        }
        return res.status(400).json({ message: "Wrong Master Id" })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.body.wallet) {
            const staff = await staffModel.findById(id);
            if (!staff) {
                return res.status(400).json({ message: "Wrong Master Id" });
            };

            const admin = await adminModel.findById(staff.admin);
            if (!admin || admin.wallet < req.body.wallet) {
                return res.status(400).json({ message: "Insufficient Balance in Admin Wallet" });
            }

            await adminModel.findByIdAndUpdate(staff.admin, { $inc: { wallet: -req.body.wallet } });
            await staffModel.findByIdAndUpdate(id, { $inc: { wallet: req.body.wallet } });

            return res.status(200).json({ message: "Master Wallet Updated Successfully" });
        }

        const staff = await staffModel.findByIdAndUpdate(id, req.body);
        if (staff) {
            return res.status(200).json({ message: "Master Updated Successfully" });
        }

        return res.status(400).json({ message: "Wrong Master Id" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createStaff,
    loginStaff,
    getAllStaffs,
    deleteStaff,
    updateStaff
};