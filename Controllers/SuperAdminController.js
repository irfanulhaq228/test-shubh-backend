const jwt = require("jsonwebtoken");
const superAdminModel = require("../Models/SuperAdminModel");
const adminModel = require("../Models/AdminModel");
const WebsiteNameModel = require("../Models/WebsiteNameModel");
const staffModel = require("../Models/StaffModel");
const BetDelayModel = require("../Models/BetDelayModel");

const createSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingSuperAdmin = await superAdminModel.findOne({ email });

        if (existingSuperAdmin) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const superAdmin = await superAdminModel.create({ email, password });
        const id = superAdmin?._id;
        const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });
        return res.status(200).json({ message: "Super Admin created successfully", token });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const superAdmin = await superAdminModel.findOne({ email });
        if (!superAdmin) {
            return res.status(400).json({ message: "Incorrect Email or Password" });
        }
        if (superAdmin?.password !== password) {
            return res.status(400).json({ message: "Incorrect Email or Password" })
        }
        const id = superAdmin?._id;
        const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });
        return res.status(200).json({ message: "Super Admin Logged In Successfully", id: superAdmin._id, token });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllAdmins = async (req, res) => {
    try {
        const admins = await adminModel.find();
        if (admins.length === 0) {
            return res.status(400).json({ message: "No Admin Available" });
        }

        const updatedAdmins = await Promise.all(
            admins.map(async (admin) => {
                const betDelay = await BetDelayModel.findOne({ admin: admin._id });

                return {
                    ...admin.toObject(),
                    delayId: betDelay ? betDelay._id : null,
                    delayTime: betDelay ? betDelay.delayTime : '0',
                };
            })
        );

        return res.status(200).json({ data: updatedAdmins });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};


const createAdmin = async (req, res) => {
    try {
        const { email, domain, password, oddRate } = req.body;
        const checkAdmin = await adminModel.find({ email });
        if (checkAdmin?.length > 0) {
            return res.status(400).json({ message: "Email already Exists" })
        }
        const data = {
            email,
            password,
            otp: "111111",
            otpExpiration: new Date(),
            verified: true,
            loginDetails: [],
            domain,
            wallet: 0,
            oddRate,
            firstTime: true,
            ...req.body
        }
        const admin = await adminModel.create(data);
        await WebsiteNameModel.create({ name: req.body.name, admin: admin._id });
        let validate = null;
        validate = Math.floor(100000 + Math.random() * 900000).toString();
        const staff = new staffModel({ email, password, admin: admin._id, type: "main", validate });
        await staff.save();
        return res.status(200).json({ message: "Admin Created Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateAdmin = async (req, res) => {
    try {
        // const token = req.headers.authorization.split(' ')[1];
        // if (!token || token === "") {
        //     return res.status(400).json({ message: 'No token provided' });
        // }
        // const decoded = jwt.verify(token, process.env.SECRET_KEY);
        // const superAdminId = decoded?.id || null;
        // const check = await superAdminModel.findById(superAdminId);
        // if (!check) {
        //     return res.status(400).json({ message: "No Super Admin Found" })
        // }
        const { id } = req.params;
        const { email, domain } = req.body;
        const checkAdmin = await adminModel.find({ email });
        if (checkAdmin?.length > 0) {
            return res.status(400).json({ message: "Email already Exists" })
        }
        const checkDomain = await adminModel.find({ domain });
        if (checkDomain?.length > 0) {
            return res.status(400).json({ message: "Domain already Exists" })
        }
        const admin = await adminModel.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json({ message: "Admin Updated Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateAdminStatus = async (req, res) => {
    try {
        // const token = req.headers.authorization.split(' ')[1];
        // if (!token || token === "") {
        //     return res.status(400).json({ message: 'No token provided' });
        // }
        // const decoded = jwt.verify(token, process.env.SECRET_KEY);
        // const superAdminId = decoded?.id || null;
        // const check = await superAdminModel.findById(superAdminId);
        // if (!check) {
        //     return res.status(400).json({ message: "No Super Admin Found" })
        // }
        const { id } = req.params;
        const { value } = req.body;
        const admin = await adminModel.findByIdAndUpdate(id, { verified: value });
        if (!admin) {
            return res.status(400).json({ message: "Admin Not Found" })
        }
        return res.status(200).json({ message: "Admin Updated Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateAdminWallet = async (req, res) => {
    try {
        // const token = req.headers.authorization.split(' ')[1];
        // if (!token || token === "") {
        //     return res.status(400).json({ message: 'No token provided' });
        // }

        // const decoded = jwt.verify(token, process.env.SECRET_KEY);
        // const superAdminId = decoded?.id || null;
        // const check = await superAdminModel.findById(superAdminId);
        // if (!check) {
        //     return res.status(400).json({ message: "No Super Admin Found" });
        // }

        const { id } = req.params;
        const { value } = req.body;

        const numericValue = Number(value);
        if (isNaN(numericValue)) {
            return res.status(400).json({ message: "Points must be in numbers" });
        }

        const admin = await adminModel.findById(id);
        if (!admin) {
            return res.status(400).json({ message: "Admin Not Found" });
        }

        const updatedWalletValue = (admin.wallet || 0) + numericValue;
        admin.wallet = updatedWalletValue;
        await admin.save();

        return res.status(200).json({ message: "Admin Updated Successfully", wallet: updatedWalletValue });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createSuperAdmin,
    loginSuperAdmin,
    getAllAdmins,
    createAdmin,
    updateAdmin,
    updateAdminStatus,
    updateAdminWallet
};