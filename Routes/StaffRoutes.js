const express = require("express");
const { getAllStaffs, deleteStaff, createStaff, loginStaff, updateStaff, updateStaffByItself, creditTrnsactionAPI } = require("../Controllers/StaffController");

const StaffRouter = express.Router();

StaffRouter.post("/", createStaff);
StaffRouter.post("/creditTrn/:id", creditTrnsactionAPI);
StaffRouter.post("/login", loginStaff);
StaffRouter.get("/", getAllStaffs);
StaffRouter.delete("/:id", deleteStaff);
StaffRouter.post("/update", updateStaffByItself);
StaffRouter.put("/:id", updateStaff);


module.exports = StaffRouter;