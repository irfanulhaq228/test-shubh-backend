const fs = require('fs');
const redis = require('redis');
const { default: axios } = require('axios');
const gameModel = require('../Models/GameModel');
const EventModel = require('../Models/EventsModel');

const redisClient = redis.createClient({
    socket: {
        host: '62.72.57.126',
        port: 6379
    },
    password: 'NETREX2024@'
});

redisClient.connect().then().catch(err => console.error("Redis connection error:", err));

const sportConfigs = [
    { id: 4, name: "cricket" },
    { id: 2, name: "tennis" },
    { id: 1, name: "soccer" }
];

const fn_getAllMatchesApi = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "No Sport ID Found" });
        console.log("Sport ID ==> ", id);

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls?apiType=matchListManish&sportId=${id}`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.log("error ====> ", error);
        return res.status(500).json({ message: "Network Error", error: error });
    }
};

const fn_getEvents = async (req, res) => {
    try {
        const cached = await redisClient.get("new_api_events");

        if (!cached) {
            return res.status(404).json({ message: "No cached events found. Please run /store-events first." });
        }

        return res.status(200).json(JSON.parse(cached));
    } catch (error) {
        console.error("getEvents error:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

const fn_storeEvents = async () => {
    try {
        const finalFormattedData = [];

        for (const sport of sportConfigs) {
            const response = await axios.get(`https://api.trovetown.co/v1/apiCalls?apiType=matchListManish&sportId=${sport.id}`);
            const data = response.data;

            const competitionMap = new Map();
            const seenEvents = new Set();

            data?.forEach(item => {
                const uniqueKey = `${item.eventName}|${item.competitionName}`;
                if (seenEvents.has(uniqueKey)) return;
                seenEvents.add(uniqueKey);

                if (!competitionMap.has(item.competitionId)) {
                    competitionMap.set(item.competitionId, {
                        competitionName: item.competitionName,
                        competitionId: item.competitionId,
                        events: []
                    });
                }

                const competition = competitionMap.get(item.competitionId);
                const isDuplicate = competition.events.some(e => e.eventId === item.eventId);
                if (!isDuplicate) {
                    let matchOddMarketId = null;

                    if (item.markets && Array.isArray(item.markets)) {
                        const matchOddsMarket = item.markets.find(market => market.marketName === "Match Odds");
                        if (matchOddsMarket) {
                            matchOddMarketId = matchOddsMarket.marketId;
                        }
                    }

                    competition.events.push({
                        eventId: item.eventId,
                        eventName: item.eventName,
                        date: item.openDate,
                        matchOddMarketId: matchOddMarketId,
                        eventTypeId: sport.id
                    });
                }
            });

            finalFormattedData.push({
                sportName: sport.name,
                sportId: String(sport.id),
                competitions: Array.from(competitionMap.values())
            });
        }

        await EventModel.deleteMany({});
        await EventModel.insertMany(finalFormattedData);

        await redisClient.set("new_api_events", JSON.stringify(finalFormattedData), { EX: 3600 });

    } catch (error) {
        console.error("storeEvents error:", error);
    }
};

const fn_getAdminGames = async (req, res) => {
    try {
        const adminId = req.adminId;
        const data = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));

        const adminGames = await gameModel.find({
            disabled: false,
            admins: { $elemMatch: { admin: adminId, status: true } },
        });

        const updatedGames = data.filter((game) => adminGames.some((adminGame) => adminGame.name.toLowerCase() == game.game.toLowerCase())).map((game) => {
            const matchingAdminGame = adminGames.find(
                (adminGame) => adminGame.name.toLowerCase() === game.game.toLowerCase()
            );
            return {
                ...game,
                image: matchingAdminGame?.image || null,
            };
        });

        await redisClient.set('gamesData', JSON.stringify(updatedGames));

        res.status(200).json({ message: "Data Direct Gets", data: updatedGames });
    } catch (err) {
        console.error("Error storing data in Redis:", err);
        res.status(500).json({ message: "Error storing data" });
    }
};

const fn_getMarkets = async (req, res) => {
    try {
        const { eventId, sportId } = req.query;
        if (!eventId || !sportId || eventId === "" || sportId === "") return res.status(400).json({ message: "No event id or sport id" });

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls?apiType=matchListManish&sportId=${sportId}`);
        if (!response) return res.status(400).json({ message: "No Sport Found" });

        const event = response?.data?.find((e) => e?.eventId == eventId);
        if (!event) return res.status(400).json({ message: "No Market Found of this Event" });

        const formattedMarketIds = event?.markets?.map(m => m.marketId).join(',');

        return res.status(200).json({
            eventId: event?.eventId,
            eventName: event?.eventName,
            competitionName: event?.competitionName,
            competitionId: event?.competitionId,
            sportId: event?.sportId,
            sportName: event?.sportName?.toLowerCase(),
            markets: event?.markets,
            formattedMarketIds: formattedMarketIds,
            date: event?.date || event?.openDate
        });

    } catch (error) {
        console.log("error while getting markets", error);
        res.status(500).json({ message: "Error storing data" });
    }
};

const fn_getBetDataApi = async (req, res) => {
    try {
        const { marketIds } = req.query;
        if (!marketIds) return res.status(400).json({ message: "No Market Id Found" });

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls/betfairData?marketIds=${marketIds}`);
        return res.status(200).json(response?.data || []);
    } catch (error) {
        console.log("error ====> ", error?.response?.data);
        return res.status(500).json({ message: "Failed to fetch betfair data", error: error });
    }
};

const fn_getInPlayEvents = async (req, res) => {
    try {
        const { sportId } = req.query;
        if (!sportId) return res.status(400).json({ message: "No Sport ID Found" });

        const cachedData = await redisClient.get("new_api_events");
        if (!cachedData) {
            return res.status(404).json({ message: "No cached events found. Please run /store-events first." });
        }

        const parsedData = JSON.parse(cachedData);
        const sportData = parsedData.find(sport => sport.sportId === sportId);
        if (!sportData) return res.status(404).json({ message: "No events found for the given Sport ID" });

        const currentDateTime = new Date();
        const formattedCompetitions = [];

        sportData.competitions.forEach(competition => {
            const filteredEvents = competition.events.filter(event => {
                const eventDateTime = new Date(event.date);
                const normalizedEventName = event.eventName.replace(/\s+/g, '').toLowerCase();
                const normalizedCompetitionName = competition.competitionName.replace(/\s+/g, '').toLowerCase();
                return eventDateTime <= currentDateTime && normalizedEventName !== normalizedCompetitionName;
            });

            if (filteredEvents.length > 0) {
                formattedCompetitions.push({
                    competitionName: competition.competitionName,
                    competitionId: competition.competitionId,
                    events: filteredEvents
                });
            }
        });

        return res.status(200).json({ sportId, competitions: formattedCompetitions });
    } catch (error) {
        console.error("Error in fn_getFilteredEvents:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

module.exports = {
    fn_getAllMatchesApi,
    fn_getEvents,
    fn_getBetDataApi,
    fn_storeEvents,
    fn_getAdminGames,
    fn_getMarkets,
    fn_getInPlayEvents
};