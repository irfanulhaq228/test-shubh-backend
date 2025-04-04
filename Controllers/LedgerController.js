const jwt = require("jsonwebtoken");
const LedgerModel = require("../Models/LedgerModel.js");

const createLedger = async (req, res) => {
    try {
        const response = await LedgerModel.create(req.body);
        return res.status(200).json({ message: "Ledger Updated!", data: response });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllLedger = async (req, res) => {
    try {
        const ledger = await LedgerModel.find();
        if (ledger.length === 0) {
            return res.status(400).json({ message: "Ledger is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: ledger });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getLedgerByAdmin = async (req, res) => {
    try {
        const ledger = await LedgerModel.find({ admin: req.adminId }).populate('user');
        if (ledger.length === 0) {
            return res.status(400).json({ message: "Ledger is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: ledger });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

module.exports = {
    createLedger,
    getAllLedger,
    getLedgerByAdmin
};