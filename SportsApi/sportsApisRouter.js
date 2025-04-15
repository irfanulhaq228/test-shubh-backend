const express = require("express");
const checkDomain = require("../middleware");

const { fn_getExtraMarketsData } = require("./sportsApis2");
const { fn_getAllMatchesApi, fn_getBetDataApi, fn_getEvents, fn_getAdminGames, fn_getMarkets, fn_getInPlayEvents } = require("./sportsApis");

const SportsApiRouter = express.Router();

SportsApiRouter.get("/all-matches", fn_getAllMatchesApi);
SportsApiRouter.get("/events-data", fn_getEvents);
SportsApiRouter.get("/bets-data", fn_getBetDataApi);
SportsApiRouter.get("/games-data", checkDomain, fn_getAdminGames);
SportsApiRouter.get("/get-markets", fn_getMarkets);
SportsApiRouter.get("/in-play", fn_getInPlayEvents);

SportsApiRouter.get("/extra-markets", fn_getExtraMarketsData);

module.exports = SportsApiRouter;