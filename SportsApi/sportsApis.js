const { default: axios } = require('axios');

const fn_getAllMatchesApi = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "No Sport ID Found" });
        console.log("Sport ID ==> ", id);

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls?apiType=matchListManish&sportId=${id}`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.log("error ====> ", error);
    }
};

const fn_getBetDataApi = async (req, res) => {
    try {
        const { marketIds } = req.query;
        if (!marketIds) return res.status(400).json({ message: "No Market Id Found" });
        console.log("Market Ids ==> ", marketIds);

        const response = await axios.get(`https://api.trovetown.co/v1/apiCalls/betfairData?marketIds=1.241485721`);
        return res.status(200).json(response?.data);
    } catch (error) {
        console.log("error ====> ", error);
        return res.status(500).json({ message: "Failed to fetch betfair data", error: error });
    }
}

module.exports = {
    fn_getAllMatchesApi,
    fn_getBetDataApi
};