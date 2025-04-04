const fs = require('fs');
const redis = require('redis');
const cron = require('node-cron');
const express = require("express");
const { default: axios } = require('axios');
const gameModel = require('../Models/GameModel');
const EventModel = require('../Models/EventsModel');
const ActiveMarket = require('../Models/ActiveMarket');
const betModel = require('../Models/BetsModel');
const userModel = require('../Models/UserModel');
const checkDomain = require('../middleware');
const sendCustomNotification = require('../firebase');

const redisClient = redis.createClient({
    socket: {
        host: '62.72.57.126',
        port: 6379
    },
    password: 'NETREX2024@'
});

redisClient.connect().then().catch(err => console.error("Redis connection error:", err));

const REDIS = express.Router();

// ====== api for getting competitions(tournaments) according to the sport ID  ========

REDIS.get("/get-competitions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const url = `http://172.105.54.97:8085/api/new/getCompetitions?id=${id}`;
        const response = await axios.get(url);
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching competitions:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

// ============ api for gitting events(matches) according to the sport ID & competetion ID  ========

//  should  be change from querry to body
REDIS.get("/get-events", async (req, res) => {
    try {
        const { sportId, sId } = req.query;
        const url = `http://172.105.54.97:8085/api/new/getEvents?sid=${sId}&sportid=${sportId}`;
        const response = await axios.get(url);
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching competitions:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

const getEvents = async () => {
    try {
        const sportsData = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));
        const data = [];
        const currentDate = new Date();
        const next30Days = new Date();
        currentDate.setDate(currentDate.getDate() - 5);
        next30Days.setDate(currentDate.getDate() + 30);

        const promises = sportsData.map(async (sport) => {
            const competitionURL = `http://172.105.54.97:8085/api/new/getCompetitions?id=${sport.id}`;

            try {
                const competitionResponse = await axios.get(competitionURL);
                const competitionPromises = competitionResponse.data.map(async (competition) => {
                    const eventsURL = `http://172.105.54.97:8085/api/new/getEvents?sid=${competition.competition.id}&sportid=${sport.id}`;
                    const eventsResponse = await axios.get(eventsURL);

                    const filteredEvents = eventsResponse.data.filter((item) => {
                        const eventDate = new Date(item.event.openDate);
                        return eventDate >= currentDate && eventDate <= next30Days;
                    }).map((item) => ({
                        eventId: item.event.id,
                        eventName: item.event.name,
                        date: item.event.openDate,
                        iplay: item.event.inplay
                    }));

                    return {
                        competitionName: competition.competition.name,
                        competitionId: competition.competition.id,
                        events: filteredEvents
                    };
                });

                const competitions = await Promise.all(competitionPromises);

                await EventModel.findOneAndUpdate(
                    { sportId: sport.id },
                    {
                        sportName: sport.game,
                        sportId: sport.id,
                        competitions: competitions
                    },
                    { upsert: true, new: true }
                );

                const validCompetitions = competitions.filter(competition => competition.events.length > 0);

                if (validCompetitions.length > 0) {
                    return {
                        sportName: sport.game,
                        sportId: sport.id,
                        competitions: validCompetitions
                    };
                }

                return null;
            } catch (error) {
                console.error(`Error fetching data from URL for sportId ${sport.id}:`, error.message);
                const sportDoc = await EventModel.findOne({ sportId: sport.id });

                if (sportDoc) {
                    const filteredCompetitions = sportDoc.competitions.filter(competition => {
                        const filteredEvents = competition.events.filter(event => {
                            const eventDate = new Date(event.date);
                            return eventDate >= currentDate && eventDate <= next30Days;
                        });
                        return filteredEvents.length > 0;
                    });

                    if (filteredCompetitions.length > 0) {
                        return {
                            sportName: sportDoc.sportName,
                            sportId: sportDoc.sportId,
                            competitions: filteredCompetitions
                        };
                    }
                }

                return null;
            }
        });

        const results = await Promise.all(promises);
        const filteredResults = results.filter(result => result !== null);

        data.push(...filteredResults);
        redisClient.set('events_data', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error processing request:', error.message);
        throw new Error("Server Error");
    }
};

REDIS.get("/live-events", async (req, res) => {
    try {
        const sportsData = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));
        const data = [];

        const promises = sportsData.map(async (sport) => {
            const competitionURL = `http://172.105.54.97:8085/api/new/getCompetitions?id=${sport.id}`;

            try {
                const competitionResponse = await axios.get(competitionURL);
                const competitionPromises = competitionResponse.data.map(async (competition) => {
                    const eventsURL = `http://172.105.54.97:8085/api/new/getEvents?sid=${competition.competition.id}&sportid=${sport.id}`;
                    const eventsResponse = await axios.get(eventsURL);

                    const events = await Promise.all(eventsResponse.data.map(async (item) => {
                        const market_url = `http://172.105.54.97:8085/api/new/geMarketsList?EventID=${item.event.id}&sportid=${sport.id}`;
                        const marketResponse = await axios.get(market_url);

                        // Ensure market data is available
                        if (!marketResponse.data || marketResponse.data.length === 0) {
                            return {
                                eventId: item.event.id,
                                eventName: item.event.name,
                                date: item.event.openDate,
                                markets: [],
                                runners: []
                            };
                        }

                        const marketIds = marketResponse.data.map((m) => `ODDS_${m.marketId}`);
                        const testMarketIds = marketResponse.data.map((m) => m.marketId);

                        // Fetch runners data for each market
                        const runnersData = await Promise.all(testMarketIds.map(async (m) => {
                            const URL = `http://172.105.54.97:8085/api/new/gerunners?MarketID=${m}&sportid=${sport.id}`;
                            try {
                                const runnerResponse = await axios.get(URL);
                                return runnerResponse.data;
                            } catch (err) {
                                console.error(`Error fetching runners for MarketID ${m}:`, err.message);
                                return [];
                            }
                        }));

                        // Fetch odds data
                        const odds = await fn_getMarketOdds(marketIds);

                        // Merge markets with odds
                        const markets = marketResponse.data.map((market) => {
                            return {
                                ...market,
                                odds: odds[market.marketId] || null
                            };
                        });

                        return {
                            eventId: item.event.id,
                            eventName: item.event.name,
                            date: item.event.openDate,
                            markets,
                            runners: runnersData
                        };
                    }));

                    return {
                        competitionName: competition.competition.name,
                        competitionId: competition.competition.id,
                        events
                    };
                });

                const competitions = await Promise.all(competitionPromises);

                return {
                    sportName: sport.game,
                    sportId: sport.id,
                    competitions
                };
            } catch (error) {
                console.error(`Error fetching data for sportId ${sport.id}:`, error.message);

                const sportDoc = await EventModel.findOne({ sportId: sport.id });

                if (sportDoc) {
                    return {
                        sportName: sportDoc.sportName,
                        sportId: sportDoc.sportId,
                        competitions: sportDoc.competitions
                    };
                }

                return {
                    sportName: sport.game,
                    sportId: sport.id,
                    competitions: []
                };
            }
        });

        const results = await Promise.all(promises);
        data.push(...results);

        return res.status(200).json(data);
    } catch (error) {
        console.error('Error processing request:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/events-data", async (req, res) => {
    try {
        const data = await redisClient.get("events_data");
        if (!data) {
            return res.status(404).json({ message: "No data found" });
        }

        const parsedData = JSON.parse(data);

        // Sort the top-level objects by sportId in descending order
        parsedData.sort((a, b) => {
            const sportIdA = typeof a.sportId === 'string' ? parseInt(a.sportId) : a.sportId;
            const sportIdB = typeof b.sportId === 'string' ? parseInt(b.sportId) : b.sportId;
            return sportIdB - sportIdA;
        });

        for (let i = 0; i < parsedData?.length; i++) {
            parsedData[i]?.competitions.sort((a, b) => a.competitionName.localeCompare(b.competitionName));

            parsedData[i]?.competitions.forEach(competition => {
                competition.events.sort((a, b) => a.eventName.localeCompare(b.eventName));
            });
        }

        return res.status(200).json({ data: parsedData });
    } catch (error) {
        console.error("Error processing request:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

// ============ api for getting markets using sport ID and event ID  ========

REDIS.post("/markets", async (req, res) => {
    try {
        const { sportId, eventId } = req.body;
        const URL = `http://172.105.54.97:8085/api/new/geMarketsList?EventID=${eventId}&sportid=${sportId}`;
        const response = await axios.get(URL);
        const marketIds = response.data.map((m) => `ODDS_${m.marketId}`);
        const testMarketIds = response.data.map((m) => m.marketId);
        const runnersData = await Promise.all(testMarketIds.map(async (m) => {
            const URL = `http://172.105.54.97:8085/api/new/gerunners?MarketID=${m}&sportid=${sportId}`;
            const runnerResponse = await axios.get(URL);
            return runnerResponse.data;
        }));
        const odds = await fn_getMarketOdds(marketIds);

        const mergedData = response.data.map((market) => {
            return {
                ...market,
                odds: odds[market.marketId] || null
            };
        });
        const diamondMarkets = await redisClient.get(`d_${eventId}`);
        const bookmakersData = JSON.parse(diamondMarkets)?.data?.t2?.[0];
        return res.status(200).json({ data: mergedData, runners: runnersData, marketIds: testMarketIds, bookmakersData: bookmakersData || [] });
    } catch (error) {
        console.error('Error processing request:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/markets-bookmaker", checkDomain, async (req, res) => {
    try {
        const { eventId } = req.query;
        const diamondMarketsRaw = await redisClient.get(`d_${eventId}`);

        if (!diamondMarketsRaw) {
            return res.status(404).json({ message: "Data not found" });
        }

        const diamondMarkets = JSON.parse(diamondMarketsRaw);
        const bookmakersData = diamondMarkets?.data?.t2?.[0];
        // const resultBookmakerDataRaw = await redisClient.get(`bookmaker_result_${eventId}`);
        // const resultBookmakerData = resultBookmakerDataRaw ? JSON.parse(resultBookmakerDataRaw).find((r) => r.adminId === req.adminId) : null;

        // const updatedBookmakerData = bookmakersData?.map((b) => {
        //     const findResult = resultBookmakerData?.data?.find((r) => r?.mid === b?.mid);
        //     if (findResult && findResult.rollBack === false) {
        //         return null;
        //     }
        //     return b;
        // });

        return res.status(200).json({ bookmakersData: bookmakersData || [] });
        // return res.status(200).json(updatedBookmakerData?.filter((u) => u !== null) || []);
    } catch (error) {
        console.error('Error processing request:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/markets-fancy", checkDomain, async (req, res) => {
    try {
        const { eventId } = req.query;
        const diamondMarketsRaw = await redisClient.get(`d_${eventId}`);
        const resultFancyDataRaw = await redisClient.get(`result_${eventId}`);

        if (!diamondMarketsRaw) {
            return res.status(404).json({ message: "Data not found" });
        }

        const diamondMarkets = JSON.parse(diamondMarketsRaw);
        const fancyData = diamondMarkets?.data?.t3;
        const resultFancyData = resultFancyDataRaw ? JSON.parse(resultFancyDataRaw).find((r) => r.adminId === req.adminId) : null;

        const updatedFancyData = fancyData?.map((f) => {
            const findResult = resultFancyData?.data?.find((r) => `${r?.mid}-${r?.sid}` === `${f?.mid}-${f?.sid}`);
            if (findResult && findResult.rollBack === false) {
                return null;
            }
            return f;
        });

        return res.status(200).json(updatedFancyData?.filter((u) => u !== null) || []);
    } catch (error) {
        console.error('Error processing request:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/markets-test", async (req, res) => {
    try {
        const { sportId, eventId } = req.query;
        const URL = `http://172.105.54.97:8085/api/new/geMarketsList?EventID=${eventId}&sportid=${sportId}`;
        const response = await axios.get(URL);
        const marketIds = response.data.map((m) => `ODDS_${m.marketId}`);
        const testMarketIds = response.data.map((m) => m.marketId);
        const runnersData = await Promise.all(testMarketIds.map(async (m) => {
            const URL = `http://172.105.54.97:8085/api/new/gerunners?MarketID=${m}&sportid=${sportId}`;
            const runnerResponse = await axios.get(URL);
            return runnerResponse.data;
        }));
        const odds = await fn_getMarketOdds(marketIds);

        const mergedData = response.data.map((market) => {
            return {
                ...market,
                odds: odds[market.marketId] || null
            };
        });
        const diamondMarkets = await redisClient.get(`d_${eventId}`);
        const bookmakersData = JSON.parse(diamondMarkets)?.data?.t2;
        return res.status(200).json({ data: mergedData, runners: runnersData, marketIds: testMarketIds, bookmakersData: bookmakersData || [] });
    } catch (error) {
        console.error('Error processing request:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

const fn_getMarketOdds = async (marketIds) => {
    try {
        if (marketIds && marketIds.length > 0) {
            const oddsFromRedis = await redisClient.mGet(marketIds);
            const odds = oddsFromRedis.reduce((acc, elem, index) => {
                if (!elem) return acc;
                let parsedElem;
                try {
                    parsedElem = JSON.parse(elem);
                } catch (error) {
                    console.error('Error parsing JSON from Redis:', error.message);
                    return acc;
                }
                if (!parsedElem) return acc;

                delete parsedElem.totalMatchedFormated;
                delete parsedElem.hash;

                parsedElem.runners.forEach((runner) => {
                    if (runner.ex) {
                        if (runner.ex.availableToBack.length > 3) {
                            runner.ex.availableToBack = runner.ex.availableToBack.slice(0, 3);
                            runner.back = JSON.parse(JSON.stringify(runner.ex.availableToBack));
                        } else {
                            runner.back = [];
                        }
                        if (runner.ex.availableToLay.length > 3) {
                            runner.ex.availableToLay = runner.ex.availableToLay.slice(0, 3);
                            runner.lay = JSON.parse(JSON.stringify(runner.ex.availableToLay));
                        } else {
                            runner.lay = [];
                        }
                        if (runner.ex.tradedVolume && runner.ex.tradedVolume.length > 0) {
                            runner.tradedVolume = [runner.ex.tradedVolume[0]];
                        } else {
                            runner.tradedVolume = [];
                        }
                    } else {
                        runner.back = [];
                        runner.lay = [];
                    }
                    delete runner.tradedVolume;
                    delete runner.ex.tradedVolume;
                });

                acc[marketIds[index].replace('ODDS_', '')] = parsedElem;
                return acc;
            }, {});

            return odds;
        } else {
            return {};
        }
    } catch (e) {
        console.error('Error in fn_getMarketOdds:', e.message);
        return {};
    }
};

// ============ api for getting active markets ========

REDIS.get("/active-market", async (req, res) => {
    try {
        const sportsData = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));
        const marketdata = await redisClient.mGet(["ALL_ACTIVE_MARKETS"]);
        const marketData = JSON.parse(marketdata);
        const marketIds = marketData.map(i => i.market_id);
        const formattedData = sportsData.map(sport => {
            const activeMarkets = marketData.filter(market => market.Sportid == sport.id.toString());
            return {
                ...sport,
                activeMarket: activeMarkets,
                marketLength: activeMarkets.length
            };
        });
        return res.status(200).json({ data: formattedData, marketIds, marketIdsLength: marketIds.length, marketDataLength: marketData.length });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/live-market", async (req, res) => {
    try {
        const { sportId } = req.query;

        const marketdata = await redisClient.get("ALL_ACTIVE_MARKETS");
        if (!marketdata) {
            return res.status(404).json({ message: "No market data found" });
        }
        const marketData = JSON.parse(marketdata).filter(market => market.eventTypeId == sportId);

        const competitionData = await redisClient.get("events_data");
        const competitions = JSON.parse(competitionData).find((comp) => comp.sportId == sportId);

        const newMarket = await Promise.all(marketData.filter(m => m.marketName === "Match Odds").map(async (market) => {
            const odd = await redisClient.get(`ODDS_${market.market_id}`);
            const parsedOdd = JSON.parse(odd);

            if (parsedOdd && parsedOdd.inplay) {
                let matchName = "";
                let competitionName = "";
                let competitionId = "";
                let inplay = false;
                let date = "";

                for (const competition of competitions?.competitions) {
                    const event = competition?.events?.find(event => event.eventId === market.eventId);
                    if (event) {
                        matchName = event.eventName;
                        competitionName = competition.competitionName;
                        competitionId = competition.competitionId;
                        inplay = event?.inplay;
                        date = event?.date;
                        break;
                    }
                }

                return {
                    ...market,
                    odd: parsedOdd,
                    matchName,
                    competitionName,
                    competitionId,
                    inplay,
                    date
                };
            }
            return null;
        }));

        const filteredMarket = newMarket.filter(market => market !== null);

        const groupedByCompetition = filteredMarket.reduce((acc, market) => {
            const { competitionId, competitionName, matchName, ...rest } = market;

            if (!acc[competitionId]) {
                acc[competitionId] = {
                    competitionId,
                    competitionName,
                    events: []
                };
            }

            acc[competitionId].events.push({
                matchName,
                ...rest
            });

            return acc;
        }, {});

        // Filter out competitions with an empty competitionName
        const result = Object.values(groupedByCompetition).filter(competition => competition.competitionName.trim() !== "");

        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/inplay-market", checkDomain, async (req, res) => {
    try {
        const { sportId } = req.query;
        if (sportId !== "all") {
            const marketdata = await redisClient.get("ALL_ACTIVE_MARKETS");
            if (!marketdata) {
                return res.status(404).json({ message: "No market data found" });
            }
            const marketData = JSON.parse(marketdata).filter(market => market.eventTypeId == sportId);

            const competitionData = await redisClient.get("events_data");
            const competitions = JSON.parse(competitionData).find((comp) => comp.sportId == sportId);

            const newMarket = await Promise.all(marketData.filter(m => m.marketName === "Match Odds").map(async (market) => {
                const odd = await redisClient.get(`ODDS_${market.market_id}`);
                const parsedOdd = JSON.parse(odd);

                if (parsedOdd && parsedOdd?.inplay) {
                    let matchName = "";
                    let competitionName = "";
                    let competitionId = "";
                    let date = "";

                    for (const competition of competitions.competitions) {
                        const event = competition.events.find(event => event.eventId === market.eventId);
                        if (event) {
                            matchName = event.eventName;
                            competitionName = competition.competitionName;
                            competitionId = competition.competitionId;
                            date = event.date;
                            break;
                        }
                    }

                    return {
                        ...market,
                        odd: parsedOdd,
                        matchName,
                        competitionName,
                        competitionId,
                        date
                    };
                }
                return null;
            }));

            const filteredMarket = newMarket.filter(market => market !== null);

            const groupedByCompetition = filteredMarket.reduce((acc, market) => {
                const { competitionId, competitionName, matchName, ...rest } = market;

                if (!acc[competitionId]) {
                    acc[competitionId] = {
                        competitionId,
                        competitionName,
                        events: []
                    };
                }

                acc[competitionId].events.push({
                    matchName,
                    ...rest
                });

                return acc;
            }, {});

            const result = Object.values(groupedByCompetition);

            return res.status(200).json(result);
        } else {
            const adminId = req.adminId;
            const marketdata = await redisClient.get("ALL_ACTIVE_MARKETS");
            if (!marketdata) {
                return res.status(404).json({ message: "No market data found" });
            }
            const findGames = await gameModel.find({
                disabled: false,
                admins: {
                    $elemMatch: {
                        admin: adminId,
                        status: true
                    }
                }
            });
            const gamesIds = findGames.map((game) => game?.name === "cricket" ? 4 : game?.name === "soccer" ? 1 : game?.name === "tennis" ? 2 : null);
            const marketData = JSON.parse(marketdata).filter(market => gamesIds.includes(market.eventTypeId));
            const competitionData = await redisClient.get("events_data");
            const competitions = JSON.parse(competitionData);

            const newMarket = await Promise.all(marketData.filter(m => m.marketName === "Match Odds").map(async (market) => {
                const odd = await redisClient.get(`ODDS_${market.market_id}`);
                const parsedOdd = JSON.parse(odd);

                if (parsedOdd && parsedOdd?.inplay) {
                    let matchName = "";
                    let competitionName = "";
                    let competitionId = "";
                    let date = "";

                    for (var i = 0; i < competitions?.length; i++) {
                        for (const competition of competitions?.[i].competitions) {
                            const event = competition.events.find(event => event.eventId === market.eventId);
                            if (event) {
                                matchName = event.eventName;
                                competitionName = competition.competitionName;
                                competitionId = competition.competitionId;
                                date = event.date;
                                break;
                            }
                        }
                    }

                    return {
                        ...market,
                        odd: parsedOdd,
                        matchName,
                        competitionName,
                        competitionId,
                        date
                    };
                }
                return null;
            }));

            const filteredMarket = newMarket.filter(market => market !== null);

            const groupedByCompetition = filteredMarket.reduce((acc, market) => {
                const { competitionId, competitionName, matchName, ...rest } = market;

                if (!acc[competitionId]) {
                    acc[competitionId] = {
                        competitionId,
                        competitionName,
                        events: []
                    };
                }

                acc[competitionId].events.push({
                    matchName,
                    ...rest
                });

                return acc;
            }, {});

            const result = Object.values(groupedByCompetition);

            return res.status(200).json(result);
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error" });
    }
});

REDIS.get("/single-sports", async (req, res) => {
    try {
        const { sportId } = req.query;

        const marketdata = await redisClient.get("ALL_ACTIVE_MARKETS");
        if (!marketdata) {
            return res.status(404).json({ message: "No market data found" });
        }
        const marketData = JSON.parse(marketdata).filter(market => market.eventTypeId == sportId);

        const competitionData = await redisClient.get("events_data");
        const competitions = JSON.parse(competitionData).find((comp) => comp.sportId == sportId);

        const newMarket = await Promise.all(marketData.filter(m => m.marketName === "Match Odds").map(async (market) => {
            const odd = await redisClient.get(`ODDS_${market.market_id}`);
            const parsedOdd = JSON.parse(odd);

            if (parsedOdd) {
                let matchName = "";
                let competitionName = "";
                let competitionId = "";
                let date = "";

                for (const competition of competitions.competitions) {
                    const event = competition.events.find(event => event.eventId === market.eventId);
                    if (event) {
                        matchName = event.eventName;
                        competitionName = competition.competitionName;
                        competitionId = competition.competitionId;
                        date = event.date;
                        break;
                    }
                }

                return {
                    ...market,
                    odd: parsedOdd,
                    matchName,
                    competitionName,
                    competitionId,
                    date
                };
            }
            return null;
        }));

        const filteredMarket = newMarket.filter(market => market !== null);

        const groupedByCompetition = filteredMarket.reduce((acc, market) => {
            const { competitionId, competitionName, matchName, ...rest } = market;

            if (!acc[competitionId]) {
                acc[competitionId] = {
                    competitionId,
                    competitionName,
                    events: []
                };
            }

            acc[competitionId].events.push({
                matchName,
                ...rest
            });

            return acc;
        }, {});

        const result = Object.values(groupedByCompetition);

        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error" });
    }
});

// ============ api for getting runners using market ID and sport ID  ========

REDIS.get("/runners", async (req, res) => {
    try {
        const { marketId, sportId } = req.query;
        const URL = `http://172.105.54.97:8085/api/new/gerunners?MarketID=${marketId}&sportid=${sportId}`;
        const response = await axios.get(URL);

        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error processing request:', error.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

// ============ seperate market data according to the market ids ===========

REDIS.get("/get-formated-active-market", async (req, res) => {
    try {
        const sportsData = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));
        const marketdata = await redisClient.mGet(["ALL_ACTIVE_MARKETS"]);
        const marketData = JSON.parse(marketdata);
        const formattedData = sportsData.map(sport => {
            const activeMarkets = marketData.filter(market => market.Sportid === sport.id.toString());
            return {
                ...sport,
                activeMarket: activeMarkets,
                marketLength: activeMarkets.length
            };
        });
        return res.status(200).json({ data: formattedData, marketData: marketData.length });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error" });
    }
});

// =========================================================================

const storeActiveMarkets = async () => {
    try {
        const data = await redisClient.mGet(["ALL_ACTIVE_MARKETS"]);
        if (data && data.length > 0) {
            const markets = JSON.parse(data[0]);
            await ActiveMarket.insertMany(markets);
            console.log(`Stored ${markets.length} active markets in the database.`);
            await redisClient.set('lastExecutionTimestamp', Date.now().toString());
        } else {
            console.log("No active markets data found in Redis.");
        }
    } catch (err) {
        console.error("Error retrieving data from Redis or storing in MongoDB:", err);
    }
};

REDIS.post('/store-active-markets', async (req, res) => {
    try {
        await storeActiveMarkets();
        res.status(200).json({ message: "Active markets data stored successfully." });
    } catch (err) {
        console.error("Error storing active markets data:", err);
        res.status(500).json({ message: "Error storing active markets data." });
    }
});

cron.schedule('0 */2 * * *', () => {
    console.log('Fetching active markets from Redis and storing in MongoDB...');
    storeActiveMarkets();
});

const shouldStoreActiveMarkets = async () => {
    const lastExecutionTimestamp = await redisClient.get('lastExecutionTimestamp');
    if (!lastExecutionTimestamp) {
        return true;
    }
    const now = Date.now();
    // const twoHours = 2 * 60 * 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    // return (now - parseInt(lastExecutionTimestamp)) >= twoHours;
    return (now - parseInt(lastExecutionTimestamp)) >= fiveMinutes;
};

REDIS.post('/games-data', checkDomain, async (req, res) => {
    try {
        const adminId = req.adminId;

        const data = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));

        const adminGames = await gameModel.find({
            disabled: false,
            admins: { $elemMatch: { admin: adminId, status: true } },
        });

        const updatedGames = data
            .filter((game) =>
                adminGames.some((adminGame) => adminGame.name.toLowerCase() === game.game.toLowerCase())
            )
            .map((game) => {
                const matchingAdminGame = adminGames.find(
                    (adminGame) => adminGame.name.toLowerCase() === game.game.toLowerCase()
                );
                return {
                    ...game,
                    image: matchingAdminGame?.image || null,
                };
            });

        await redisClient.set('gamesData', JSON.stringify(updatedGames));

        res.status(200).json({ message: "Games Data stored in Redis", data: updatedGames });
    } catch (err) {
        console.error("Error storing data in Redis:", err);
        res.status(500).json({ message: "Error storing data" });
    }
});

REDIS.post('/soccer-data', async (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync('./JSON_DATA/soccer_match_list.json', 'utf8'));

        const activeGames = await gameModel.find({ disabled: false });

        const activeSports = activeGames.map(game => game.name.toLowerCase());

        const filteredMatchesData = data.filter(match => activeSports.includes(match.sport.toLowerCase()));

        await redisClient.set('sportsData', JSON.stringify(filteredMatchesData));
        console.log("Data successfully stored in Redis!");

        const now = new Date();

        const upcomingMatches = filteredMatchesData.filter(match => new Date(match.openDate) > now);
        const liveMatches = filteredMatchesData.filter(match => match?.inplay);

        res.status(200).json({
            message: "Data stored in Redis",
            live: liveMatches,
            upcoming: upcomingMatches
        });
    } catch (err) {
        console.error("Error storing data in Redis:", err);
        res.status(500).json({ message: "Error storing data" });
    }
});

REDIS.post('/cricket-data', async (req, res) => {
    try {
        const matchesData = JSON.parse(fs.readFileSync('./JSON_DATA/cricket_match_list.json', 'utf8'));
        const oddsData = JSON.parse(fs.readFileSync('./JSON_DATA/cricket_match_odds.json', 'utf8'));

        const activeGames = await gameModel.find({ disabled: false }, 'name adminCommision');
        const activeSportsMap = {};
        activeGames.forEach(game => {
            activeSportsMap[game.name] = game.adminCommision;
        });

        const filteredMatchesData = matchesData.filter(match => activeSportsMap.hasOwnProperty(match.sport.toLowerCase()));

        const matchesWithCommission = filteredMatchesData.map(match => ({
            ...match,
            adminCommission: activeSportsMap[match.sport.toLowerCase()]
        }));

        await redisClient.set('cricketData', JSON.stringify(matchesWithCommission));
        console.log("Data successfully stored in Redis!");

        const now = new Date();

        const upcomingMatches = matchesWithCommission.filter(match => new Date(match.openDate) > now);
        const liveMatches = matchesWithCommission.filter(match => match?.inplay);

        const mergedMatches = matchesWithCommission.map(match => {
            const oddsMatch = oddsData.find(odds => odds.eventId === match.eventId);
            return {
                ...match,
                odds: oddsMatch ? oddsMatch : {}
            };
        });

        res.status(200).json({
            message: "Data stored in Redis",
            live: liveMatches.map(match => ({
                ...match,
                odds: mergedMatches.find(m => m.eventId === match.eventId)?.odds
            })),
            upcoming: upcomingMatches.map(match => ({
                ...match,
                odds: mergedMatches.find(m => m.eventId === match.eventId)?.odds
            })),
        });
    } catch (err) {
        console.error("Error storing data in Redis:", err);
        res.status(500).json({ message: "Error storing data" });
    }
});

REDIS.get('/market-data', async (req, res) => {
    try {
        const data = await redisClient.mGet(["ALL_ACTIVE_MARKETS"]);
        if (!data || data.length === 0) {
            return res.status(404).json({ message: "No active markets data found" });
        }
        res.status(200).json({ message: "Active markets data", data: JSON.parse(data[0]) });
    } catch (err) {
        console.error("Error retrieving data from Redis:", err);
        res.status(500).json({ message: "Error retrieving data" });
    }
});

REDIS.get('/data', GetMarketOdds);

async function GetMarketOdds(req, res) {
    let { market_id } = req.query;
    try {
        if (market_id) {
            let marketIds = market_id.split(',').map(k => 'ODDS_' + k);
            let oddsFromRedis = await redisClient.mGet(marketIds);
            let odds = oddsFromRedis.map(elem => {
                let parsedElem = JSON.parse(elem);
                if (!parsedElem) return null;
                delete parsedElem.totalMatchedFormated;
                delete parsedElem.hash;
                parsedElem.runners.forEach(runner => {
                    if (runner.ex) {
                        if (runner.ex.availableToBack.length > 3) {
                            runner.ex.availableToBack = runner.ex.availableToBack.slice(0, 3);
                            runner.back = JSON.parse(JSON.stringify(runner.ex.availableToBack));
                        } else {
                            runner.back = [];
                        }
                        if (runner.ex.availableToLay.length > 3) {
                            runner.ex.availableToLay = runner.ex.availableToLay.slice(0, 3);
                            runner.lay = JSON.parse(JSON.stringify(runner.ex.availableToLay));
                        } else {
                            runner.lay = [];
                        }
                        if (runner.ex.tradedVolume && runner.ex.tradedVolume.length > 0) {
                            runner.tradedVolume = [runner.ex.tradedVolume[0]];
                        } else {
                            runner.tradedVolume = [];
                        }
                    } else {
                        runner.back = [];
                        runner.lay = [];
                    }
                    // Remove ex object
                    delete runner.tradedVolume;
                    delete runner.ex.tradedVolume;
                });
                return parsedElem;
            }).filter(elem => elem !== null); // Filter out null elements
            if (odds.length > 0) {
                return res.status(200).json(odds);
            } else {
                return res.status(200).json([]);
            }
        } else {
            return res.status(400).json({
                message: 'Please enter the required market ID(s)',
            });
        }
    } catch (e) {
        return res.status(200).json([]);
    }
}

// ============ api for getting odds of match_odds market using eventId and sportId ============

REDIS.get('/single-market-odds', async (req, res) => {
    const { eventId, sportId } = req.query;
    try {
        const URL = `http://172.105.54.97:8085/api/new/geMarketsList?EventID=${eventId}&sportid=${sportId}`;
        const response = await axios.get(URL);
        const singleMarket = response.data.find((res) => res?.marketName === "Match Odds");
        const formatedMarketId = "ODDS_" + singleMarket?.marketId;
        const odds = await redisClient.get(formatedMarketId);
        res.status(200).json({ message: "Data Fetched", data: JSON.parse(odds) });
    } catch (err) {
        console.error("Error retrieving data from Redis:", err);
        res.status(500).json({ message: "Error retrieving data" });
    }
});

REDIS.get('/fancy-result-latest', async (req, res) => {
    const { eventId } = req.query;
    try {
        const URL = `http://172.105.54.97:8085/api/new/fancyResultData?eventid=${eventId}`;
        const response = await axios.get(URL);
        res.status(200).json({ message: "Data Fetched", data: response?.data });
    } catch (err) {
        console.error("Error retrieving data from Redis:", err);
        res.status(500).json({ message: "Error retrieving data", error: err });
    }
});

const extraMarketsResult = async () => {
    try {
        const bets = await betModel.find({ status: { $nin: ["win", "loss", "abandoned"] }, gameId: { $regex: /-/ } });
        const resultedBetsPromises = bets.map(async (bet) => {
            let str = bet?.selectionName;
            let selectionName = str.replace(/\s\d+$/, "");
            console.log("selectionName ", selectionName)
            const URL = `http://172.105.54.97:8085/api/new/fancyResultData?eventid=${bet?.eventId}`;
            try {
                const eventsResult = await axios.get(URL);
                const results = eventsResult?.data;

                if (results && results?.length > 0) {
                    const findSpecificMarketResult = results?.find((result) => result?.fancyName?.toLowerCase().includes(selectionName) && result?.isDeclare === true && result?.isRollback === false);

                    if (!findSpecificMarketResult) {
                        const rollbackResult = results?.find((result) => result?.fancyName?.toLowerCase().includes(selectionName) && result?.isRollback === true);
                        if (rollbackResult) {
                            await handleRollback(rollbackResult);
                        }
                    };
                    console.log("findSpecificMarketResult ", findSpecificMarketResult)
                    return findSpecificMarketResult || null;
                } else {
                    return null;
                }
            } catch (error) {
                console.error(`Error fetching results for bet ${bet._id}:`, error);
                return null;
            }
        });
        const resultedBets = await Promise.all(resultedBetsPromises);
        const filteredResultedBets = resultedBets?.filter(m => m !== null);

        for (const result of filteredResultedBets) {
            const { eventId, selectionId, decisionRun, fancyName } = result;
            try {
                const removeLastNumber = (str) => str.replace(/\s\d+$/, "");
                const findingBets = await betModel.find({
                    eventId: eventId,
                    status: { $nin: ["win", "loss", "abandoned"] }
                });
                // Now filter the results manually
                const bet = findingBets.find(b => {
                    return removeLastNumber(b.selectionName.toLowerCase()) === fancyName?.toLowerCase()
                });
                if (bet) {
                    const { side, odd } = bet;
                    console.log("side ", side);
                    console.log("odd ", side);
                    const user = await userModel.findById(bet?.user);
                    if (side === "Back") {
                        if (decisionRun >= odd) {
                            bet.status = "win";
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        } else {
                            bet.status = "loss";
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        }
                    } else if (side === "Lay") {
                        if (decisionRun < odd) {
                            bet.status = "win";
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        } else {
                            bet.status = "loss";
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        }
                    }

                    await bet.save();
                    console.log("Updated bet: ", bet);
                }
            } catch (error) {
                console.error(`Error updating bet with eventId ${eventId} and selectionId ${selectionId}:`, error);
            }
        }

        console.log("selectedId ", filteredResultedBets);
    } catch (error) {
        console.log("error occurs while updating extra markets result", error);
    }
}

const handleRollback = async (rollbackResult) => {
    const { eventId, selectionName } = rollbackResult;

    try {
        const betsToRollback = await betModel.find({
            eventId: eventId,
            selectionName: selectionName,
            isRolledback: false
        });

        for (const bet of betsToRollback) {

            if (bet.status === "win") {
                const user = await userModel.findById(bet.user);
                if (user) {
                    if (user?.wallet >= bet?.profit) {
                        user.wallet -= bet.profit;
                        await user.save();
                        console.log(`User's wallet updated: Deducted profit ${bet.profit}`);
                    } else {
                        console.log(`Insufficient funds in user's wallet to deduct profit.`);
                    }
                } else {
                    console.log(`User not found for bet ${bet._id}`);
                }
            }

            if (bet.status === "loss") {
                const user = await userModel.findById(bet.user); // Assuming bet.user is the user ID
                if (user) {
                    user.wallet += bet.loss; // Add loss amount to user's wallet
                    await user.save();
                    console.log(`User's wallet updated: Added loss ${bet.loss}`);
                } else {
                    console.log(`User not found for bet ${bet._id}`);
                }
            }

            bet.status = "pending";
            bet.isRolledback = true;
            await bet.save();

            console.log(`Rollback completed for bet ${bet._id}`);
        }

        console.log(`Rollback handled for eventId ${eventId}`);
    } catch (error) {
        console.error("Error handling rollback: ", error);
    }
};

// ============ api for getting bets and updates according to it ============

const updateBets = async () => {
    try {
        const openBets = await betModel.find({ status: { $nin: ["win", "loss", "abandoned"] }, marketName: { $nin: ["fancy", "bookmaker", "meter", "oddeven"] } });

        if (openBets?.length === 0) {
            return;
        }

        const updates = openBets?.map(async (bet) => {
            const marketId = bet?.marketId;
            const betResultString = await redisClient.get(`ODDS_${marketId}`);
            const betResult = JSON.parse(betResultString);

            if (!betResult) {
                console.log(`${bet?.marketId} is not found`);
                return null;
            };

            if (betResult?.status !== "OPEN" && betResult?.status === "CLOSED") {
                const runner = betResult.runners?.find((r) => r.selectionId == bet?.gameId);

                if (runner) {
                    if (runner.status === "WINNER") {
                        const user = await userModel.findById(bet?.user);
                        if (bet?.side === "Back") {
                            console.log("WINNER Back ", bet?.marketId);
                            if (user) {
                                const updatedWallet = user.wallet + bet?.profit + bet?.amount;
                                await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                                await betModel.findByIdAndUpdate(bet?._id, { status: "win" });
                                if (user?.fcmTokens) {
                                    await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                                }
                            }
                        } else if (bet?.side === "Lay") {
                            console.log("WINNER Lay ", bet?.marketId);
                            await betModel.findByIdAndUpdate(bet?._id, { status: "loss" });
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        }
                    } else {
                        const user = await userModel.findById(bet?.user);
                        if (bet?.side === "Lay") {
                            console.log("LOSER Lay ", bet?.marketId);
                            if (user) {
                                const updatedWallet = user.wallet + bet?.profit + bet?.amount;
                                await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                                await betModel.findByIdAndUpdate(bet?._id, { status: "win" });
                                if (user?.fcmTokens) {
                                    await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                                }
                            }
                        } else if (bet?.side === "Back") {
                            console.log("LOSER Back ", bet?.marketId);
                            await betModel.findByIdAndUpdate(bet?._id, { status: "loss" });
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        }
                    }
                }
            }
        });

        await Promise.all(updates);
    } catch (err) {
        console.error("Error processing bets:", err);
    }
};

const updateOtherBets = async () => {
    try {
        const openBets = await betModel.find({ status: { $nin: ["win", "loss", "abandoned"] }, marketName: "fancy" });

        if (openBets?.length === 0) {
            return;
        }

        const updates = openBets.map(async (bet) => {
            const eventId = bet?.eventId;
            const betResultString = await redisClient.get(`result_${eventId}`);
            const betResult = JSON.parse(betResultString);
            const resultByAdmin = betResult?.find((b) => b?.adminId === bet?.admin.toHexString());
            if (resultByAdmin) {
                const betResultOfAdmin = resultByAdmin?.data?.find((r) => `${r?.mid}-${r?.sid}` === bet?.gameId);
                if (betResultOfAdmin) {
                    const user = await userModel.findById(bet?.user);
                    const declaredResult = betResultOfAdmin?.result;
                    if (declaredResult !== "abandoned") {
                        const bettedResult = bet?.odd;
                        if (declaredResult >= bettedResult) {
                            if (bet?.side === "Back") {
                                const updatedWallet = user.wallet + bet?.profit + bet?.amount;
                                await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                                await betModel.findByIdAndUpdate(bet?._id, { status: "win" });
                                if (user?.fcmTokens) {
                                    await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                                }
                            } else if (bet?.side === "Lay") {
                                await betModel.findByIdAndUpdate(bet?._id, { status: "loss" });
                                if (user?.fcmTokens) {
                                    await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                                }
                            }
                        } else {
                            if (bet?.side === "Back") {
                                await betModel.findByIdAndUpdate(bet?._id, { status: "loss" });
                                if (user?.fcmTokens) {
                                    await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                                }
                            } else if (bet?.side === "Lay") {
                                const updatedWallet = user.wallet + bet?.profit + bet?.amount;
                                await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                                await betModel.findByIdAndUpdate(bet?._id, { status: "win" });
                                if (user?.fcmTokens) {
                                    await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                                }
                            }
                        }
                    } else {
                        await betModel.findByIdAndUpdate(bet?._id, { status: "abandoned" });
                        const updatedWallet = user.wallet + bet?.amount;
                        await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                    }
                }
            }
        });

        await Promise.all(updates);
    } catch (err) {
        console.error("Error processing bets:", err);
    }
};

const updateBookmakerBets = async () => {
    try {
        const openBets = await betModel.find({ status: { $nin: ["win", "loss", "abandoned"] }, marketName: "bookmaker" });
        if (openBets?.length === 0) {
            return;
        };

        const updates = openBets.map(async (bet) => {
            const eventId = bet?.eventId;
            const betResultString = await redisClient.get(`bookmaker_result_${eventId}`);
            const betResult = JSON.parse(betResultString);
            const resultByAdmin = betResult?.find((b) => b?.adminId === bet?.admin.toHexString());
            if (resultByAdmin) {
                const betResultOfAdmin = resultByAdmin?.data?.find((r) => `${r?.mid}-${r?.sid}` === bet?.gameId);
                if (betResultOfAdmin) {
                    const user = await userModel.findById(bet?.user);
                    const declaredResult = betResultOfAdmin?.result;
                    if (declaredResult.toLowerCase() === "yes") {
                        if (bet?.side === "Back") {
                            const updatedWallet = user.wallet + bet?.profit + bet?.amount;
                            await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                            await betModel.findByIdAndUpdate(bet?._id, { status: "win" });
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        } else if (bet?.side === "Lay") {
                            await betModel.findByIdAndUpdate(bet?._id, { status: "loss" });
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        }
                    } else if (declaredResult.toLowerCase() === "no") {
                        if (bet?.side === "Back") {
                            await betModel.findByIdAndUpdate(bet?._id, { status: "loss" });
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Try Again', `Unfortunately, You loss the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        } else if (bet?.side === "Lay") {
                            const updatedWallet = user.wallet + bet?.profit + bet?.amount;
                            await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                            await betModel.findByIdAndUpdate(bet?._id, { status: "win" });
                            if (user?.fcmTokens) {
                                await sendCustomNotification('Congratulations', `Wao, You won the bet of ${bet?.gameName}`, user?.fcmTokens);
                            }
                        }
                    } else {
                        const updatedWallet = user.wallet + bet?.amount;
                        await userModel.findByIdAndUpdate(bet?.user, { wallet: updatedWallet });
                        await betModel.findByIdAndUpdate(bet?._id, { status: "abandoned" });
                    }
                }
            };
        });

        await Promise.all(updates);
    } catch (err) {
        console.error("Error processing bets:", err);
    }
};

REDIS.get('/filter-odds', async (req, res) => {
    try {
        // Step 1: Get all Redis keys
        const keys = await redisClient.keys('*'); // Fetch all keys from Redis

        // Step 2: Filter keys that include "ODDS_"
        const oddsKeys = keys.filter((key) => key.includes("ODDS_"));

        // Step 3: Fetch and filter keys with status !== "OPEN"
        const filteredData = [];
        for (const key of oddsKeys) {
            const value = await redisClient.get(key); // Fetch data for the key
            const parsedValue = JSON.parse(value);   // Parse the JSON data

            if (parsedValue?.status !== "OPEN") {
                filteredData.push({ key, data: parsedValue });
            }
        }

        res.status(200).json({
            message: "Filtered data fetched successfully",
            data: filteredData,
        });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-single-odd', async (req, res) => {
    try {
        const { marketId } = req.query;
        const data = await redisClient.get(`ODDS_${marketId}`);
        res.status(200).json({ data: JSON.parse(data) });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-single-odd-2', async (req, res) => {
    try {
        const { marketId } = req.query;
        // await redisClient.set(`bookmaker_result_33830385`, '[]');
        const data = await redisClient.get(marketId);
        res.status(200).json(JSON.parse(data));
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-single-odd-3', async (req, res) => {
    try {
        // const { marketId } = req.query;
        await redisClient.set(`bookmaker_result_33830385`, '[]');
        const data = await redisClient.get(`bookmaker_result_33830385`);
        res.status(200).json(JSON.parse(data));
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/popular-events/cricket', async (req, res) => {
    try {
        const response = await redisClient.get("events_data");
        const data = JSON.parse(response);

        const cricketData = data?.find((d) => d?.sportId == 4);
        if (cricketData?.competitions?.length > 0) {
            let allEvents = [];

            for (const competition of cricketData.competitions) {
                if (competition.events?.length > 0) {
                    const events = await Promise.all(
                        competition?.events?.map(async (event) => {
                            const URL = `http://172.105.54.97:8085/api/new/geMarketsList?EventID=${event.eventId}&sportid=4`;
                            const marketResponse = await axios.get(URL);
                            const marketResponseUp = marketResponse?.data || [];
                            if (Array.isArray(marketResponseUp)) {
                                const filteredMarkets = marketResponseUp.filter((market) => market.marketName === "Match Odds");
                                if (filteredMarkets.length > 0) {
                                    return {
                                        ...event,
                                        markets: [filteredMarkets[0]],
                                        competitionName: competition?.competitionName
                                    };
                                } else {
                                    return null;
                                }
                            } else {
                                return null;
                            }
                        })
                    );

                    allEvents = allEvents.concat(events.filter((e) => e !== null));
                }
            }

            allEvents = allEvents.filter((event) => event.markets[0]?.totalMatched > 0);

            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            allEvents = allEvents.filter((event) => {
                const eventDate = new Date(event.date);
                return (
                    eventDate.toDateString() === now.toDateString() || eventDate.toDateString() === tomorrow.toDateString()
                );
            });

            allEvents.sort((a, b) => (b.markets[0]?.totalMatched || 0) - (a.markets[0]?.totalMatched || 0));

            res.status(200).json(allEvents);
        } else {
            res.status(404).json({ message: "No cricket data found" });
        }
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

// =========== getting those events which run fancy markets ===========

REDIS.get('/get-events-by-fancy', async (req, res) => {
    try {
        const response = await redisClient.get("events_data");
        const data = JSON.parse(response);

        const cricketData = data?.find((d) => d?.sportId == 4);

        if (cricketData?.competitions?.length > 0) {
            let allEvents = [];

            for (const competition of cricketData.competitions) {
                if (competition.events?.length > 0) {
                    const events = await Promise.all(
                        competition?.events?.map(async (event) => {
                            const diamondMarketInString = await redisClient.get(`d_${event?.eventId}`);
                            if (diamondMarketInString) {
                                const diamondMarket = JSON.parse(diamondMarketInString);
                                if (diamondMarket?.data?.t3?.length > 0 || diamondMarket?.data?.t4?.length > 0) {
                                    return {
                                        ...event,
                                        competitionName: competition?.competitionName,
                                        competitionId: competition?.competitionId
                                    };
                                } else {
                                    return null;
                                }
                            } else {
                                return null;
                            }
                        })
                    );

                    allEvents = allEvents.concat(events.filter((e) => e !== null));
                }
            }
            res.status(200).json(allEvents);
        } else {
            res.status(404).json({ message: "No events found" });
        }
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-fancy-eventId', checkDomain, async (req, res) => {
    try {
        const { eventId } = req.query;
        const adminId = req.adminId;
        const diamondMarketInString = await redisClient.get(`d_${eventId}`);
        const diamondMarketResultInString = await redisClient.get(`result_${eventId}`);

        if (!diamondMarketInString) {
            return res.status(400).json({ message: "No fancy found" });
        }

        const diamondMarket = JSON.parse(diamondMarketInString);

        if (diamondMarket?.data?.t3?.length === 0 && diamondMarket?.data?.t4?.length === 0) {
            return res.status(400).json({ message: "No fancy found" });
        }

        const diamondMarketResult = diamondMarketResultInString ? JSON.parse(diamondMarketResultInString)?.find(m => m?.adminId === adminId) : null;

        const updatedDiamondMarket = [...diamondMarket?.data?.t3, ...diamondMarket?.data?.t4]?.map((d) => {
            if (!diamondMarketResultInString) {
                return d;
            } else {
                const specificMarket = diamondMarketResult?.data?.find(dm => `${dm?.mid}-${dm?.sid}` === `${d?.mid}-${d?.sid}`);
                if (!specificMarket) {
                    return d;
                } else {
                    return { ...d, result: specificMarket?.result, rollBack: specificMarket?.rollBack };
                }
            }
        })
        return res.status(200).json(updatedDiamondMarket);
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.post('/update-fancy-result', checkDomain, async (req, res) => {
    try {
        const adminId = req.adminId;
        const { eventId, fancy, result } = req.body;

        const resultedObjectInString = await redisClient.get(`result_${eventId}`);
        let resultedObject = resultedObjectInString ? JSON.parse(resultedObjectInString) : [];

        let adminResult = resultedObject.find(obj => obj.adminId === adminId);

        if (adminResult) {
            const prevResult = adminResult.data.find(r => `${r.mid}-${r.sid}` === `${fancy.mid}-${fancy.sid}`);
            if (prevResult) {
                prevResult.result = result;
            } else {
                adminResult.data.push({ ...fancy, result, rollBack: false });
            }
        } else {
            const newAdminResult = {
                adminId: adminId,
                data: [{ ...fancy, result, rollBack: false }]
            };
            resultedObject.push(newAdminResult);
        }

        await redisClient.set(`result_${eventId}`, JSON.stringify(resultedObject));
        return res.status(200).json({ message: "Bet Result Updated" });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.post('/update-fancy-rollback', checkDomain, async (req, res) => {
    try {
        const adminId = req.adminId;
        const { eventId, fancy, rollBack } = req.body;

        const resultedObjectInString = await redisClient.get(`result_${eventId}`);
        let resultedObject = resultedObjectInString ? JSON.parse(resultedObjectInString) : [];

        let adminResult = resultedObject.find(obj => obj.adminId === adminId);

        if (adminResult) {
            const prevResult = adminResult.data.find(r => `${r.mid}-${r.sid}` === `${fancy.mid}-${fancy.sid}`);
            if (prevResult) {
                prevResult.rollBack = rollBack;
            } else {
                adminResult.data.push({ ...fancy, rollBack: rollBack });
            }
        } else {
            const newAdminResult = {
                adminId: adminId,
                data: [{ ...fancy, rollBack: rollBack }]
            };
            resultedObject.push(newAdminResult);
        }

        await redisClient.set(`result_${eventId}`, JSON.stringify(resultedObject));
        return res.status(200).json({ message: "Bet Result Updated" });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

// =========== getting those events which run bookmaker markets ===========

REDIS.get('/get-events-by-bookmaker/cricket', async (req, res) => {
    try {
        const response = await redisClient.get("events_data");
        const data = JSON.parse(response);

        const cricketData = data?.find((d) => d?.sportId == 4);

        if (cricketData?.competitions?.length > 0) {
            let allEvents = [];

            for (const competition of cricketData.competitions) {
                if (competition.events?.length > 0) {
                    const events = await Promise.all(
                        competition?.events?.map(async (event) => {
                            const diamondMarketInString = await redisClient.get(`d_${event?.eventId}`);
                            if (diamondMarketInString) {
                                const diamondMarket = JSON.parse(diamondMarketInString);
                                if (diamondMarket?.data?.t2?.length > 0 && diamondMarket?.data?.t2?.[0]?.bm1?.length > 0) {
                                    return {
                                        ...event,
                                        competitionName: competition?.competitionName,
                                        competitionId: competition?.competitionId
                                    };
                                } else {
                                    return null;
                                }
                            } else {
                                return null;
                            }
                        })
                    );

                    allEvents = allEvents.concat(events.filter((e) => e !== null));
                }
            }
            res.status(200).json(allEvents);
        } else {
            res.status(404).json({ message: "No events found" });
        }
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-events-by-bookmaker/tennis', async (req, res) => {
    try {
        const response = await redisClient.get("events_data");
        const data = JSON.parse(response);

        const cricketData = data?.find((d) => d?.sportId == 2);

        if (cricketData?.competitions?.length > 0) {
            let allEvents = [];

            for (const competition of cricketData.competitions) {
                if (competition.events?.length > 0) {
                    const events = await Promise.all(
                        competition?.events?.map(async (event) => {
                            const diamondMarketInString = await redisClient.get(`d_${event?.eventId}`);
                            if (diamondMarketInString) {
                                const diamondMarket = JSON.parse(diamondMarketInString);
                                if (diamondMarket?.data?.t2?.length > 0 && diamondMarket?.data?.t2?.[0]?.bm1?.length > 0) {
                                    return {
                                        ...event,
                                        competitionName: competition?.competitionName,
                                        competitionId: competition?.competitionId
                                    };
                                } else {
                                    return null;
                                }
                            } else {
                                return null;
                            }
                        })
                    );

                    allEvents = allEvents.concat(events.filter((e) => e !== null));
                }
            }
            res.status(200).json(allEvents);
        } else {
            res.status(404).json({ message: "No events found" });
        }
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-events-by-bookmaker/soccer', async (req, res) => {
    try {
        const response = await redisClient.get("events_data");
        const data = JSON.parse(response);

        const cricketData = data?.find((d) => d?.sportId == 1);

        if (cricketData?.competitions?.length > 0) {
            let allEvents = [];

            for (const competition of cricketData.competitions) {
                if (competition.events?.length > 0) {
                    const events = await Promise.all(
                        competition?.events?.map(async (event) => {
                            const diamondMarketInString = await redisClient.get(`d_${event?.eventId}`);
                            if (diamondMarketInString) {
                                const diamondMarket = JSON.parse(diamondMarketInString);
                                if (diamondMarket?.data?.t2?.length > 0 && diamondMarket?.data?.t2?.[0]?.bm1?.length > 0) {
                                    return {
                                        ...event,
                                        competitionName: competition?.competitionName,
                                        competitionId: competition?.competitionId
                                    };
                                } else {
                                    return null;
                                }
                            } else {
                                return null;
                            }
                        })
                    );

                    allEvents = allEvents.concat(events.filter((e) => e !== null));
                }
            }
            res.status(200).json(allEvents);
        } else {
            res.status(404).json({ message: "No events found" });
        }
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/get-bookmaker-eventId', checkDomain, async (req, res) => {
    try {
        const { eventId } = req.query;
        console.log(eventId);
        const adminId = req.adminId;
        const diamondMarketInString = await redisClient.get(`d_${eventId}`);
        const diamondMarketResultInString = await redisClient.get(`bookmaker_result_${eventId}`);

        if (!diamondMarketInString) {
            return res.status(400).json({ message: "No bookmaker found" });
        }

        const diamondMarket = JSON.parse(diamondMarketInString);

        if (diamondMarket?.data?.t2?.length === 0 || diamondMarket?.data?.t2?.[0]?.bm1?.length === 0) {
            return res.status(400).json({ message: "No bookmaker found" });
        }

        const diamondMarketResult = diamondMarketResultInString ? JSON.parse(diamondMarketResultInString)?.find(m => m?.adminId === adminId) : null;

        const updatedDiamondMarket = diamondMarket?.data?.t2?.[0]?.bm1?.map((d) => {
            if (!diamondMarketResultInString) {
                return d;
            } else {
                const specificMarket = diamondMarketResult?.data?.find(dm => `${dm?.mid}-${dm?.sid}` === `${d?.mid}-${d?.sid}`);
                if (!specificMarket) {
                    return d;
                } else {
                    return { ...d, result: specificMarket?.result, rollBack: specificMarket?.rollBack };
                }
            }
        })

        return res.status(200).json(updatedDiamondMarket);
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.post('/update-bookmaker-result', checkDomain, async (req, res) => {
    try {
        const adminId = req.adminId;
        const { eventId, bookmaker, result } = req.body;

        const resultedObjectInString = await redisClient.get(`bookmaker_result_${eventId}`);
        let resultedObject = resultedObjectInString ? JSON.parse(resultedObjectInString) : [];

        let adminResult = resultedObject?.find(obj => obj?.adminId === adminId);

        if (adminResult) {
            const prevResult = adminResult?.data?.find(r => `${r?.mid}-${r?.sid}` === `${bookmaker?.mid}-${bookmaker?.sid}`);
            if (prevResult) {
                prevResult.result = result;
            } else {
                adminResult.data.push({ ...bookmaker, result, rollBack: false });
            }
        } else {
            const newAdminResult = {
                adminId: adminId,
                data: [{ ...bookmaker, result, rollBack: false }]
            };
            resultedObject.push(newAdminResult);
        }

        await redisClient.set(`bookmaker_result_${eventId}`, JSON.stringify(resultedObject));
        return res.status(200).json({ message: "Bet Result Updated" });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.post('/update-bookmaker-rollback', checkDomain, async (req, res) => {
    try {
        const adminId = req.adminId;
        const { eventId, bookmaker, rollBack } = req.body;

        if (!eventId || !bookmaker || rollBack === undefined) {
            return res.status(400).json({ message: "Invalid request body" });
        }

        const resultedObjectInString = await redisClient.get(`bookmaker_result_${eventId}`);
        let resultedObject = resultedObjectInString ? JSON.parse(resultedObjectInString) : [];

        let adminResult = resultedObject.find(obj => obj.adminId === adminId);

        if (adminResult) {
            const prevResult = adminResult.data.find(r => `${r.mid}-${r.sid}` === `${bookmaker.mid}-${bookmaker.sid}`);
            if (prevResult) {
                prevResult.rollBack = rollBack;
            } else {
                return res.status(404).json({ message: "Previous result not found" });
            }
        } else {
            return res.status(404).json({ message: "Admin result not found" });
        }

        await redisClient.set(`bookmaker_result_${eventId}`, JSON.stringify(resultedObject));
        return res.status(200).json({ message: "Bet Result Updated" });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        return res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/bookmaker-2-eventId', async (req, res) => {
    try {
        const { eventId } = req.query;
        const diamondMarketInString = await redisClient.get(`d_${eventId}`);

        if (!diamondMarketInString) {
            return res.status(400).json({ message: "No bookmaker found" });
        }

        const diamondMarket = JSON.parse(diamondMarketInString);

        if (diamondMarket?.data?.t2?.length === 0) {
            return res.status(400).json({ message: "No bookmaker found" });
        }
        const data = diamondMarket?.data?.t2?.[1]?.bm1;
        const data2 = diamondMarket?.data?.t2?.[1]?.bm2;
        return res.status(200).json(data?.length > 0 ? data : data2 || []);
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

REDIS.get('/bookmaker-3-eventId', async (req, res) => {
    try {
        const { eventId } = req.query;
        console.log(eventId);
        const diamondMarketInString = await redisClient.get(`d_${eventId}`);

        if (!diamondMarketInString) {
            return res.status(400).json({ message: "No bookmaker found" });
        }

        const diamondMarket = JSON.parse(diamondMarketInString);

        if (diamondMarket?.data?.t2?.length === 0) {
            return res.status(400).json({ message: "No bookmaker found" });
        }
        const data = diamondMarket?.data?.t2?.[2]?.bm1;
        const data2 = diamondMarket?.data?.t2?.[2]?.bm2;
        return res.status(200).json(data?.length > 0 ? data : data2 || []);
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

// =========== getting extra markets by event id ===========

REDIS.get('/get-extra-eventId', async (req, res) => {
    try {
        const { eventId } = req.query;
        const diamondMarketInString = await redisClient.get(`d_${eventId}`);

        if (!diamondMarketInString) {
            return res.status(400).json({ message: "No market found" });
        }

        const diamondMarket = JSON.parse(diamondMarketInString);

        const tied_match = diamondMarket?.data?.t1?.[1];

        const markets = [...diamondMarket?.data?.t4, ...diamondMarket?.data?.t5];

        const groupedMarkets = markets.reduce((acc, market) => {
            const { mname } = market;
            if (!acc[mname]) {
                acc[mname] = [];
            }
            acc[mname].push(market);
            return acc;
        }, {});

        return res.status(200).json({ ...groupedMarkets, tied_match: tied_match });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

// =========== cricket score api ===========

REDIS.get('/get-cricket-score', async (req, res) => {
    try {
        const { eventId } = req.query;
        const cricketScore = await redisClient.get(`score_${eventId}`);

        if (cricketScore) {
            const data = JSON.parse(cricketScore);
            return res.status(200).json(data);
        }
        return res.status(400).json({ message: "No Score Found" });
    } catch (err) {
        console.error("Error fetching or filtering Redis keys:", err);
        res.status(500).json({ message: "Error retrieving data", error: err.message });
    }
});

// ========= bookmaker result via match odds ============

REDIS.post('/auto-bookmaker-result', async (req, res) => {
    try {
        const openBets = await betModel.find({ status: { $nin: ["win", "loss", "abandoned"] }, marketName: "bookmaker" });
        if (openBets?.length > 0) {
            openBets?.map(async (bet) => {
                const marketId = bet?.matchOddMrId;
                const redisDataString = await redisClient.get(`ODDS_${marketId}`);
                const redisData = JSON.parse(redisDataString);
                console.log("redisData ", redisData);
                const URL = `http://172.105.54.97:8085/api/new/gerunners?MarketID=${marketId}&sportid=4`;
                const response = await axios.get(URL);
                console.log("response ", response?.data);
            })
        };
        return res.json({ status: "success" });
    } catch (error) {
        console.error("Error Resulting Auto Data", err);
    }
});

module.exports = {
    REDIS,
    shouldStoreActiveMarkets,
    storeActiveMarkets,
    getEvents,
    updateBets,
    updateOtherBets,
    updateBookmakerBets,
    extraMarketsResult
};