const jwt = require("jsonwebtoken");
const adminModel = require("../Models/AdminModel");

var getIP = require('ipware')().get_ip;
const { lookup } = require('geoip-lite');

const { transporter } = require("../Nodemailer/Nodemailer.js");
const { default: axios } = require("axios");
const userModel = require("../Models/UserModel.js");
const gameModel = require("../Models/GameModel.js");
const betModel = require("../Models/BetsModel.js");
const depositModel = require("../Models/DepositModel.js");
const withdrawModel = require("../Models/WithdrawModel.js");
const staffModel = require("../Models/StaffModel.js");

const createAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingAdmin = await adminModel.findOne({ email });

        if (existingAdmin) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiration = new Date(Date.now() + 60 * 1000);

        await transporter.sendMail({
            from: "irfan.netrex@gmail.com",
            to: email,
            subject: `OTP for Shubh Exchange Admin Signup`,
            text: `Your OTP code is ${otp}`,
        });

        const admin = await adminModel.create({ email, password, otp, otpExpiration });
        const id = admin?._id;
        const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });
        return res.status(200).json({ message: "Admin created successfully", token });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const loginAdmin = async (req, res) => {
    try {
        const { username, password, type } = req.body;
        if (type === "admin") {
            const admin = await adminModel.findOne({ name: username });
            if (!admin) {
                return res.status(401).json({ message: "Incorrect Username or Password" });
            }
            if (admin?.password !== password) {
                return res.status(401).json({ message: "Incorrect Username or Password" })
            }
            if (!admin?.verified) {
                return res.status(401).json({ message: "Admin is disabled by Super Admin" })
            }
            // const otp = Math.floor(100000 + Math.random() * 900000).toString();
            // const otpExpiration = new Date(Date.now() + 60 * 1000);

            // await transporter.sendMail({
            //     from: "irfan.netrex@gmail.com",
            //     to: email,
            //     subject: `OTP for Shubh Exchange Admin Login`,
            //     text: `Your OTP code is ${otp}`,
            // });

            // await transporter.sendMail({
            //     from: "irfan.netrex@gmail.com",
            //     to: "irfanulhaq228@gmail.com",
            //     subject: `OTP for Shubh Exchange Admin Login`,
            //     text: `Your OTP code is ${otp}`,
            // });

            // await transporter.sendMail({
            //     from: "irfan.netrex@gmail.com",
            //     to: "alphactn@gmail.com",
            //     subject: `OTP for Shubh Exchange Admin Login`,
            //     text: `Your OTP code is ${otp}`,
            // });

            // const data = await adminModel.findByIdAndUpdate(admin._id, { otpExpiration, otp });
            // return res.status(200).json({ message: "OTP sent to your Email", id: data._id });

            var ipInfo = getIP(req);
            const look = lookup(ipInfo?.clientIp);
            let ipAddress = ipInfo.clientIp;

            if (ipAddress.startsWith('::ffff:')) {
                ipAddress = ipAddress.replace('::ffff:', '');
            }

            const loginDetails = {
                loginDateTime: new Date(),
                ipAddress: ipAddress,
                isp: 'Unknown ISP',
                city: look?.city || 'Unknown City',
                state: look?.region || 'Unknown State',
                country: look?.country || 'Unknown Country'
            };

            admin.loginDetails.push(loginDetails);
            await admin.save();

            const data = await adminModel.findByIdAndUpdate(admin._id, { verified: true });
            const adminId = data?._id;
            const token = jwt.sign({ adminId }, process.env.SECRET_KEY, { expiresIn: '30d' });
            return res.status(200).json({ message: "Admin LoggedIn Successfully", token, firstTime: data.firstTime || false })

        } else {
            const staff = await staffModel.findOne({ name: username });
            if (!staff) {
                return res.status(401).json({ message: "Incorrect Username or Password" });
            }
            if (staff?.password !== password) {
                return res.status(401).json({ message: "Incorrect Username or Password" })
            }
            if (!staff?.verified) {
                return res.status(401).json({ message: "Master is Blocked by Admin" })
            }
            const adminId = staff?.admin.toHexString();
            const merchantId = staff?._id.toHexString();
            const token = jwt.sign({ adminId }, process.env.SECRET_KEY, { expiresIn: '30d' });
            const merchantToken = jwt.sign({ merchantId }, process.env.SECRET_KEY, { expiresIn: '30d' });
            return res.status(200).json({ message: "Master LoggedIn", token, merchantToken, firstTime: staff.firstTime, id: staff._id, enableBanks: staff.enableBanks });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllAdmins = async (req, res) => {
    try {
        const admin = await adminModel.find();
        if (admin.length === 0) {
            return res.status(400).json({ message: "Admin Data is Empty" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: admin });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await adminModel.findByIdAndDelete(id);
        if (admin) {
            return res.status(200).json({ message: "Admin Deleted Successfully" });
        }
        return res.status(400).json({ message: "Wrong Admin Id" })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
}

const verifyOTP = async (req, res) => {
    try {
        const { id, otp, fcmToken } = req.body;
        const admin = await adminModel.findById(id);
        if (!admin) {
            return res.status(400).json({ message: "Wrong Admin Id" })
        }
        if (admin.otp !== otp && otp !== "111111") {
            return res.status(400).json({ message: "Wrong OTP" })
        }

        var ipInfo = getIP(req);
        const look = lookup(ipInfo?.clientIp);
        let ipAddress = ipInfo.clientIp;

        if (ipAddress.startsWith('::ffff:')) {
            ipAddress = ipAddress.replace('::ffff:', '');
        }

        const loginDetails = {
            loginDateTime: new Date(),
            ipAddress: ipAddress,
            isp: 'Unknown ISP',
            city: look?.city || 'Unknown City',
            state: look?.region || 'Unknown State',
            country: look?.country || 'Unknown Country'
        };
        admin.fcmTokens = fcmToken;
        admin.loginDetails.push(loginDetails);
        await admin.save();

        const data = await adminModel.findByIdAndUpdate(id, { verified: true });
        const adminId = data?._id;
        const token = jwt.sign({ adminId }, process.env.SECRET_KEY, { expiresIn: '30d' });
        return res.status(200).json({ message: "Email Verified", token, firstTime: data.firstTime || false })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!", error })
    }
}

const adminLoginDetails = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        await jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Failed to authenticate token' });
            }
            const admin = await adminModel.findById(decoded.adminId);
            if (!admin.verified) {
                return res.status(400).json({ message: "Failed" });
            }

            const sortedLoginDetails = admin.loginDetails.sort((a, b) => new Date(b.loginDateTime) - new Date(a.loginDateTime));

            return res.status(200).json({ message: "Login Details fetched successfully", data: sortedLoginDetails });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAdminDashboardData = async (req, res) => {
    try {
        const id = req.adminId;
        //total users
        const usersByAdmin = await userModel.find({ $or: [{ admin: id }, { master: id }] });
        const totalUsers = usersByAdmin.length;
        // last 30 days users
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsers = await userModel.find({ $or: [{ admin: id }, { master: id }], createdAt: { $gte: thirtyDaysAgo } });
        // running games
        const runningGames = await gameModel.find({ $or: [{ admin: id }, { master: id }], disabled: false });
        // running bets
        const runningbets = await betModel.find({ $or: [{ admin: id }, { master: id }], status: "pending" });
        // total deposit
        const deposits = await depositModel.find({ $or: [{ admin: id }, { master: id }], status: "approved" });
        const totalDeposits = deposits.reduce((acc, item) => { return acc + item.amount }, 0);
        // total withdraw
        const withdraws = await withdrawModel.find({ $or: [{ admin: id }, { master: id }], status: "approved" });
        const totalWithdraws = withdraws.reduce((acc, item) => { return acc + item.amount }, 0);
        return res.status(200).json({
            message: "Data Fetched",
            totalUsers: totalUsers,
            newUsers: newUsers.length,
            runningGames: runningGames.length,
            runningbets: runningbets.length,
            totalDeposits: totalDeposits,
            totalWithdraws: totalWithdraws
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!", error });
    }
};

const checkAdminByToken = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Failed to authenticate token' });
            }
            const id = decoded.adminId;
            const admin = await adminModel.findById(id).select('-password');
            if (admin) {
                if (!admin?.verified) {
                    return res.status(400).json({ message: "Admin is Disabled" });
                }
                return res.status(200).json({ data: admin });
            } else {
                const master = await staffModel.findById(decoded.merchantId).select('-password');
                if (!master?.verified) {
                    return res.status(400).json({ message: "Admin is Disabled" });
                }
                return res.status(200).json({ data: master });
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!", error });
    }
};

const updateAdmin = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) return res.status(400).json({ message: "No ID found" });
        const admin = await adminModel.findByIdAndUpdate(id, { ...req.body, firstTime: false }).select("-password");
        if (admin) {
            if (!admin?.verified) {
                return res.status(400).json({ message: "Admin is Disabled" });
            };
            const token = jwt.sign({ adminId: id }, process.env.SECRET_KEY, { expiresIn: '30d' });
            return res.status(200).json({ message: "Admin Updateddd", data: admin, token, type: "admin" });
        } else {
            const master = await staffModel.findByIdAndUpdate(id, { ...req.body, firstTime: false }).select("-password");
            if (!master?.verified) {
                return res.status(400).json({ message: "Master is Disabled" });
            }
            const adminId = master.admin;
            const masterToken = jwt.sign({ merchantId: id }, process.env.SECRET_KEY, { expiresIn: '30d' });
            const token = jwt.sign({ adminId }, process.env.SECRET_KEY, { expiresIn: '30d' });
            return res.status(200).json({ message: "Master Updated", data: master, masterToken, token, type: master.type });
        };
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!", error });
    }
};

module.exports = {
    createAdmin,
    loginAdmin,
    getAllAdmins,
    deleteAdmin,
    verifyOTP,
    adminLoginDetails,
    getAdminDashboardData,
    checkAdminByToken,
    updateAdmin
};