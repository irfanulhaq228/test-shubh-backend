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
const SportsApiRouter = require("./SportsApi/sportsApisRouter.js");
const { fn_storeEvents } = require("./SportsApi/sportsApis.js");
const { fn_declareFancyResult } = require("./SportsApi/sportsApis2.js");
const { fn_getSuperAdminPendingBets, fn_updateBetResultsManually, fn_processAutoBetResults } = require("./Controllers/BetController.js");
const BetsResultRouter = require("./Routes/betsResultRoutes.js");

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
app.get("/betting/super-admin", fn_getSuperAdminPendingBets);
app.post("/betting/super-admin/result", fn_updateBetResultsManually);
app.use("/ledger", checkDomain, LedgerRouter);
app.use("/bonus", checkDomain, BonusRouter);
app.use("/bets-result", checkDomain, BetsResultRouter);

app.use("/new", SportsApiRouter);

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
    setInterval(() => {
        console.log("Running scheduled fn_storeEvents...");
        fn_storeEvents().catch(err => console.error("Scheduled fn_storeEvents error:", err));
    }, 60 * 1000);
    setInterval(() => {
        console.log("Running Fancy Result Api...");
        fn_declareFancyResult().catch(err => console.error("Scheduled fn_declareFancyResult error:", err));
    }, 120 * 1000);
    setInterval(() => {
        console.log("Running Super Admin Declared Results...");
        fn_processAutoBetResults().catch(err => console.error("Scheduled fn_processAutoBetResults error:", err));
    }, 60*1000);
});
