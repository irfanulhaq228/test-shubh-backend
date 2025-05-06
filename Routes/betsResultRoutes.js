const express = require("express");
const { createBetsResult, betsReports } = require("../Controllers/BetsResultController");

const BetsResultRouter = express.Router();

BetsResultRouter.post("/", createBetsResult);
BetsResultRouter.get("/report", betsReports);

module.exports = BetsResultRouter; 