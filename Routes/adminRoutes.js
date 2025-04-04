const express = require("express");
const { createAdmin, getAllAdmins, loginAdmin, deleteAdmin, verifyOTP, adminLoginDetails, getAdminDashboardData, checkAdminByToken, updateAdmin } = require("../Controllers/AdminController");

const AdminRouter = express.Router();

AdminRouter.post("/", createAdmin);
AdminRouter.get("/", getAllAdmins);
AdminRouter.post("/login", loginAdmin);
AdminRouter.put("/:id", updateAdmin);


AdminRouter.post("/otp", verifyOTP);
AdminRouter.delete("/:id", deleteAdmin);
AdminRouter.get("/login-details", adminLoginDetails);
AdminRouter.get("/dashboard-data", getAdminDashboardData);
AdminRouter.get("/check", checkAdminByToken);

module.exports = AdminRouter;