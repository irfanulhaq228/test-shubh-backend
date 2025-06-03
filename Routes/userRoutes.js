const express = require("express");
const { createUser, loginUser, getAllUsers, deleteUser, updateStatus, checkUser, userDataForDashboard, userApprovalAmount, userLoginDetails, checkAdminOfUsers, getUserInfo, updateUser, updatePassword, withdrawPointByAdmin, creditTrnsactionAPI } = require("../Controllers/UserController.js");

const UserRouter = express.Router();

UserRouter.get("/", getAllUsers);

UserRouter.delete("/:id", deleteUser);
UserRouter.post("/status/:id", updateStatus);
UserRouter.post("/check", checkUser)
UserRouter.get("/dashboard-data", userDataForDashboard);
UserRouter.get("/approval-amount", userApprovalAmount);
UserRouter.get("/login-details", userLoginDetails);
UserRouter.get("/get-info/:id", getUserInfo);

UserRouter.post("/", createUser);
UserRouter.post("/login", loginUser);
UserRouter.post("/creditTrn/:id", creditTrnsactionAPI);
UserRouter.get("/check-admin", checkAdminOfUsers);

UserRouter.put("/update", updateUser);
UserRouter.put("/withdraw-by-admin", withdrawPointByAdmin);
UserRouter.put("/updatePassword", updatePassword);

module.exports = UserRouter;