const redis = require('redis');
const { default: axios } = require('axios');
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

const fn_getBetDataApi = async (req, res) => {
    try {
        const { marketIds } = req.query;
        if (!marketIds) return res.status(400).json({ message: "No Market Id Found" });
        console.log("Market Ids ==> ", marketIds);

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls/betfairData?marketIds=${marketIds}`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.log("error ====> ", error);
        return res.status(500).json({ message: "Failed to fetch betfair data", error: error });
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
                    competition.events.push({
                        eventId: item.eventId,
                        eventName: item.eventName,
                        date: item.openDate
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

        // return res.status(200).json({ message: "Events saved to DB and Redis." });

    } catch (error) {
        console.error("storeEvents error:", error);
        // return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

module.exports = {
    fn_getAllMatchesApi,
    fn_getEvents,
    fn_getBetDataApi,
    fn_storeEvents
};