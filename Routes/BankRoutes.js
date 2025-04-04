const express = require("express");
const { upload } = require("../Multer/Multer");

const { createBank, getAllBanks, deleteBank, updateBank, getAllActiveBanks, getBanks, getAdminsBank, getAdminsActiveBank } = require("../Controllers/BankController");

const BankRouter = express.Router();

BankRouter.post("/", upload.single('image'), createBank);
BankRouter.get("/", getAllBanks);
BankRouter.get("/all", getBanks);
BankRouter.get("/admin", getAdminsBank);
BankRouter.get("/admin/active", getAdminsActiveBank);
BankRouter.get("/active", getAllActiveBanks);

BankRouter.delete("/:id", deleteBank);
BankRouter.patch("/:id", upload.single('image'), updateBank);

module.exports = BankRouter; 