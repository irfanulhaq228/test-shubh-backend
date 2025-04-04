const cors = require("cors");
const redis = require('redis');
const dotenv = require("dotenv");
const db = require("./db/db.js");
const express = require("express");
const bodyParser = require('body-parser');

const REDIS = require("./Redis_APIS/redis.js");
const BetRouter = require("./Routes/BetRoutes.js");
const UserRouter = require("./Routes/userRoutes.js");
const BankRouter = require("./Routes/BankRoutes.js");
const GameRouter = require("./Routes/gameRoutes.js");
const StaffRouter = require("./Routes/StaffRoutes.js");
const AdminRouter = require("./Routes/adminRoutes.js");
const WebsiteRouter = require("./Routes/colorRoutes.js");
const LedgerRouter = require("./Routes/LedgerRoutes.js");
const DepositRouter = require("./Routes/DepositRoutes.js");
const WithdrawRouter = require("./Routes/WithdrawRoutes.js");
const SuperAdminRouter = require("./Routes/SuperAdminRoutes.js");

const checkDomain = require("./middleware.js");
const BonusRouter = require("./Routes/BonusRoutes.js");

dotenv.config();

const app = express();
const router = express.Router();

const redisClient = redis.createClient({
    url: 'redis://127.0.0.1:6379',
});

redisClient.connect()
    .then(() => console.log("Connected to Redis"))
    .catch(err => console.error("Redis connection error:", err));

router.use(bodyParser.json());

app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Authorization, Content-Type',
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

db;

app.get("/", (req, res) => {
    res.json({ message: "Backend is running correctly!!!" });
});

// app.use("/user", checkDomain, checkMarketData, UserRouter);
// app.use("/admin", checkDomain, checkMarketData, AdminRouter);
// app.use("/super-admin", checkDomain, checkMarketData, SuperAdminRouter);
// app.use("/game", checkDomain, checkMarketData, GameRouter);
// app.use("/website", checkDomain, checkMarketData, WebsiteRouter);
// app.use("/bank", checkDomain, checkMarketData, BankRouter);
// app.use("/deposit", checkDomain, checkMarketData, DepositRouter);
// app.use("/withdraw", checkDomain, checkMarketData, WithdrawRouter);
// app.use("/bet", checkDomain, checkMarketData, BetRouter);
// app.use("/ledger", checkDomain, checkMarketData, LedgerRouter);

// app.use("/redis", checkMarketData, REDIS.REDIS);

// async function checkMarketData(req, res, next) {
//     const shouldStore = await REDIS.shouldStoreActiveMarkets();
//     if (shouldStore) {
//         console.log('Storing active markets data...');
//         await REDIS.storeActiveMarkets();
//         next();
//     } else {
//         console.log('Skipping the initial store.');
//         next();
//     }
// };

app.use("/user", checkDomain, UserRouter);
app.use("/admin", checkDomain, AdminRouter);
app.use("/staff", checkDomain, StaffRouter);
app.use("/super-admin", SuperAdminRouter);
app.use("/game", checkDomain, GameRouter);
app.use("/website", checkDomain, WebsiteRouter);
app.use("/bank", checkDomain, BankRouter);
app.use("/deposit", checkDomain, DepositRouter);
app.use("/withdraw", checkDomain, WithdrawRouter);
app.use("/bet", checkDomain, BetRouter);
app.use("/ledger", checkDomain, LedgerRouter);
app.use("/bonus", checkDomain, BonusRouter);

app.post("/test-payment-gateway", async (req, res) => {
    try {
        console.log("================================");
        console.log(req.body);
        return res.status(200).json(req?.body);
    } catch (error) {
        return res.status(200).json({ message: "Error Occured", error });
    }
});

app.use("/redis", REDIS.REDIS);

app.listen(process.env.PORT, () => {
    console.log(`Server runs at port ${process.env.PORT}`);
    setInterval(async () => {
        try {
            await REDIS.getEvents();
            // console.log('Updated events data');
        } catch (error) {
            console.error('Error updating events data:', error.message);
        }
    }, 60 * 1000);
    setInterval(async () => {
        try {
            await REDIS.updateBets();
            // console.log('Bets updated successfully');
        } catch (error) {
            console.error('Error updating bets:', error.message);
        }
    }, 60 * 1000);
    // manual fancy bets result
    setInterval(async () => {
        try {
            await REDIS.updateOtherBets();
            // console.log('Other Bets updated successfully');
        } catch (error) {
            console.error('Error updating bets:', error.message);
        }
    }, 2000);
    // manual bookmaker bets
    setInterval(async () => {
        try {
            await REDIS.updateBookmakerBets();
            // console.log('Other Bets updated successfully');
        } catch (error) {
            console.error('Error updating bets:', error.message);
        }
    }, 2000);
    setInterval(async () => {
        try {
            await REDIS.extraMarketsResult();
        } catch (error) {
            console.error('Error updating extra market results:', error.message);
        }
    }, 60000);
    // }, 1000);
    // REDIS.extraMarketsResult();
});
