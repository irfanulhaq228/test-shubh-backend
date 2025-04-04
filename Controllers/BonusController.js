const jwt = require("jsonwebtoken");
const bonusModel = require("../Models/BonusModel");
const staffModel = require("../Models/StaffModel");
const userModel = require("../Models/UserModel");

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
        console.log(id);

        const master = await staffModel.findById(id);
        if (!master || !master.verified) return res.status(400).json({ message: 'Master Not Available' });

        const bonus = await bonusModel.create({ ...req.body, master: id, admin: master.admin });
        return res.status(200).json({ message: "Bonus added successfully", data: bonus });
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
        if (!master || !master.verified) return res.status(400).json({ message: 'Master Not Available' });

        const data = await bonusModel.find({ master: id }).sort({ createdAt: -1 }).populate(["user", "master"]);
        if (data?.length === 0) {
            return res.status(400).json({ message: 'No Bonus Found' });
        }
        return res.status(200).json({ message: "Bonus fetched Successfully", data: data });
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
    updateBonus
};