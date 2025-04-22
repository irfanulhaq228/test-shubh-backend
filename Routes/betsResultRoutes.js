const express = require("express");
const { createBetsResult } = require("../Controllers/BetsResultController");

const BetsResultRouter = express.Router();

BetsResultRouter.post("/", createBetsResult);

module.exports = BetsResultRouter; 