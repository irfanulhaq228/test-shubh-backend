const express = require("express");
const { upload } = require("../Multer/Multer");

const { createDeposit, getAllDeposits, getDepositById, deleteDeposit, updateStatus, getDepositByAdminId } = require("../Controllers/DepositController");

const DepositRouter = express.Router();

DepositRouter.post("/", upload.single('image'), createDeposit);
DepositRouter.get("/", getAllDeposits);
DepositRouter.get("/user", getDepositById);
DepositRouter.get("/admin", getDepositByAdminId);

DepositRouter.delete("/:id", deleteDeposit);
DepositRouter.patch("/status/:id", updateStatus);

module.exports = DepositRouter; 