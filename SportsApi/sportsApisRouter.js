const express = require("express");
const checkDomain = require("../middleware");

const { fn_getExtraMarketsData, fn_getFancyResults } = require("./sportsApis2");
const { fn_getAllMatchesApi, fn_getBetDataApi, fn_getEvents, fn_getAdminGames, fn_getMarkets, fn_getInPlayEvents, fn_getAllEvents } = require("./sportsApis");

const SportsApiRouter = express.Router();

SportsApiRouter.get("/all-matches", fn_getAllMatchesApi);
SportsApiRouter.get("/events-data", fn_getEvents);
SportsApiRouter.get("/bets-data", fn_getBetDataApi);
SportsApiRouter.get("/games-data", checkDomain, fn_getAdminGames);
SportsApiRouter.get("/get-markets", fn_getMarkets);
SportsApiRouter.get("/in-play", fn_getInPlayEvents);
SportsApiRouter.get("/all-events", fn_getAllEvents);

SportsApiRouter.get("/extra-markets", fn_getExtraMarketsData);

SportsApiRouter.get("/fancy-result", fn_getFancyResults);

module.exports = SportsApiRouter;