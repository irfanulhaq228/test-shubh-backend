const express = require("express");
const checkDomain = require("../middleware");
const { fn_getAllMatchesApi, fn_getBetDataApi, fn_getEvents, fn_getAdminGames, fn_getMarkets } = require("./sportsApis");

const SportsApiRouter = express.Router();

SportsApiRouter.get("/all-matches", fn_getAllMatchesApi);
SportsApiRouter.get("/events-data", fn_getEvents);
SportsApiRouter.get("/bets-data", fn_getBetDataApi);
SportsApiRouter.get("/games-data", checkDomain, fn_getAdminGames);
SportsApiRouter.get("/get-markets", fn_getMarkets);

module.exports = SportsApiRouter;