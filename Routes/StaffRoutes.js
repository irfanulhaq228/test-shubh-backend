const express = require("express");
const { getAllStaffs, deleteStaff, createStaff, loginStaff, updateStaff } = require("../Controllers/StaffController");

const StaffRouter = express.Router();

StaffRouter.post("/", createStaff);
StaffRouter.post("/login", loginStaff);
StaffRouter.get("/", getAllStaffs);
StaffRouter.delete("/:id", deleteStaff);
StaffRouter.put("/:id", updateStaff);


module.exports = StaffRouter;