const express = require("express");
const { createBonus, getByMaster, getByUser, updateBonus } = require("../Controllers/BonusController");

const BonusRouter = express.Router();

BonusRouter.post("/", createBonus);
BonusRouter.get("/master", getByMaster);
BonusRouter.get("/user", getByUser);
BonusRouter.put("/update/:id", updateBonus);

module.exports = BonusRouter; 