const express = require("express");
const { createLedger, getAllLedger, getLedgerByAdmin } = require("../Controllers/LedgerController");

const LedgerRouter = express.Router();

LedgerRouter.post("/", createLedger);
LedgerRouter.get("/", getAllLedger);
LedgerRouter.get("/admin", getLedgerByAdmin);

module.exports = LedgerRouter;