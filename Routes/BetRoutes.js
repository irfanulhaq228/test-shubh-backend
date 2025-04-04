const express = require("express");
const { createBets, getAllBets, getAllBetsByAdmin, getAllBetsByUser, getAllOpenBetsByUser, getOpenBetsByAdmin, getCloseBetsByAdmin, updateBets } = require("../Controllers/BetController");

const BetRouter = express.Router();

BetRouter.post("/", createBets);
BetRouter.get("/", getAllBets);

// getting bets by admin token
BetRouter.get("/admin", getAllBetsByAdmin);
BetRouter.get("/admin/open", getOpenBetsByAdmin);
BetRouter.get("/admin/close", getCloseBetsByAdmin);

// getting bets by user token
BetRouter.get("/user", getAllBetsByUser);
BetRouter.get("/user/open", getAllOpenBetsByUser);

BetRouter.patch("/update", updateBets);

module.exports = BetRouter;