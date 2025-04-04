const express = require("express");
const { upload } = require("../Multer/Multer");
const { createWithdraw, getAllWithdraws, getWithdrawById, getWithdrawByAdminId, updateStatus } = require("../Controllers/WithdrawController");

const WithdrawRouter = express.Router();

WithdrawRouter.post("/", createWithdraw);
WithdrawRouter.get("/", getAllWithdraws);
WithdrawRouter.get("/user", getWithdrawById);
WithdrawRouter.get("/admin", getWithdrawByAdminId);

WithdrawRouter.patch("/status/:id", updateStatus);

module.exports = WithdrawRouter; 