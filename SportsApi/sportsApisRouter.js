const express = require("express");
const { fn_getAllMatchesApi, fn_getBetDataApi, fn_getEvents } = require("./sportsApis");

const SportsApiRouter = express.Router();

SportsApiRouter.get("/all-matches", fn_getAllMatchesApi);
SportsApiRouter.get("/events-data", fn_getEvents);
SportsApiRouter.get("/bets-data", fn_getBetDataApi);

module.exports = SportsApiRouter;