const express = require("express");
const { createAdmin, getAllAdmins, loginAdmin, deleteAdmin, verifyOTP, adminLoginDetails, getAdminDashboardData, checkAdminByToken, updateAdmin, fn_reportsApi, createDepositRequest, getDepositRequest, creditTrnsactionAPI } = require("../Controllers/AdminController");

const AdminRouter = express.Router();

AdminRouter.post("/", createAdmin);
AdminRouter.get("/", getAllAdmins);
AdminRouter.post("/login", loginAdmin);
AdminRouter.put("/:id", updateAdmin);


AdminRouter.post("/otp", verifyOTP);
AdminRouter.post("/creditTrn/:id", creditTrnsactionAPI);
AdminRouter.delete("/:id", deleteAdmin);
AdminRouter.get("/login-details", adminLoginDetails);
AdminRouter.get("/dashboard-data", getAdminDashboardData);
AdminRouter.get("/check", checkAdminByToken);

AdminRouter.get("/report", fn_reportsApi);

AdminRouter.post("/create-deposit", createDepositRequest);
AdminRouter.get("/get-deposit", getDepositRequest);

module.exports = AdminRouter;