const express = require("express");
const { createSuperAdmin, loginSuperAdmin, getAllAdmins, createAdmin, updateAdminStatus, updateAdminWallet, updateAdmin } = require("../Controllers/SuperAdminController");

const SuperAdminRouter = express.Router();

SuperAdminRouter.post("/", createSuperAdmin);
SuperAdminRouter.post("/login", loginSuperAdmin);
SuperAdminRouter.get("/admins", getAllAdmins);
SuperAdminRouter.post("/create-admin", createAdmin);
SuperAdminRouter.patch("/admin/update/:id", updateAdmin);
SuperAdminRouter.post("/update-admin/:id", updateAdminStatus);
SuperAdminRouter.post("/update-admin/wallet/:id", updateAdminWallet);

module.exports = SuperAdminRouter;