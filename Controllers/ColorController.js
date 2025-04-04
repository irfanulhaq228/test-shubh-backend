const jwt = require("jsonwebtoken");
const colorModel = require("../Models/ColorModel.js");
const WebsiteNameModel = require("../Models/WebsiteNameModel.js");
const WebsiteLogoModel = require("../Models/WebsiteLogoModel.js");
const WebsiteColorModel = require("../Models/WebsiteColorModel.js");
const WebsiteBannerModel = require("../Models/WebsiteBannerModel.js");
const BetDelayModel = require("../Models/BetDelayModel.js");

const createColor = async (req, res) => {
    try {
        const { mainColor } = req.body;
        const existingColor = await colorModel.find({ mainColor });
        if (existingColor?.length > 0) {
            return res.status(400).json({ message: "Main Color Already Exists" });
        }
        const color = await colorModel.create({ ...req.body, admin: req.adminId });
        return res.status(200).json({ message: "Color Added Successfully", color });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getAllColors = async (req, res) => {
    try {
        const color = await colorModel.find({ admin: req.adminId });
        if (color.length === 0) {
            return res.status(400).json({ message: "No Color Added" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: color });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getActiveColors = async (req, res) => {
    try {
        const admin = req.adminId;
        const color = await colorModel.find({ status: true, admin });
        if (color.length === 0) {
            return res.status(400).json({ message: "No Color Added" })
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: color });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteColor = async (req, res) => {
    try {
        const { id } = req.params;
        const color = await colorModel.findById(id);
        if (!color) {
            return res.status(400).json({ message: "Wrong Color Id" })
        }
        if (color.status) {
            return res.status(400).json({ message: "First Select Other Color to Display" });
        }
        await colorModel.findByIdAndDelete(id);
        return res.status(200).json({ message: "Color Deleted Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const color = await colorModel.findById(id);
        if (!color) {
            return res.status(400).json({ message: "No Color Found" });
        }

        if (status === null || status === undefined) {
            return res.status(400).json({ message: "No Status Found" });
        }

        const colors = await colorModel.find({ status: true });
        if (status === false) {
            if (colors.length === 1) {
                return res.status(400).json({ message: "Their must be atleast one color is selected" });
            }
        } else {
            await colorModel.updateMany({ status: false });
            await colorModel.findByIdAndUpdate(id, { status: true });
            return res.status(200).json({ message: "Color Updated" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const changeName = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "No Name Found" });
        }
        const savedName = await WebsiteNameModel.findOne({ admin: req.adminId });
        if (!savedName) {
            await WebsiteNameModel.create({ name, admin: req.adminId });
            return res.status(200).json({ message: "Website Name Updated" });
        } else {
            await WebsiteNameModel.findByIdAndUpdate(savedName._id, { name });
            return res.status(200).json({ message: "Website Name Updated" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const getWebsiteName = async (req, res) => {
    try {
        const admin = req.adminId;
        const name = await WebsiteNameModel.find({ admin });
        if (name.length === 0) {
            return res.status(400).json({ message: "No Name Found" });
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: name });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const changeWebsiteLogo = async (req, res) => {
    try {
        const image = req.file;
        if (!image) {
            return res.status(400).json({ message: "No Logo Provided" });
        }
        const savedImage = await WebsiteLogoModel.find();
        if (savedImage?.length === 0) {
            const data = new WebsiteLogoModel({ image: image.path, admin: req.adminId });
            await data.save();
            return res.status(200).json({ message: "Website Logo Updated" });
        }
        const id = savedImage[0]?._id;
        await WebsiteLogoModel.findByIdAndUpdate(id, { image: image.path });
        return res.status(200).json({ message: "Website Logo Updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getWebsiteLogo = async (req, res) => {
    try {
        const admin = req.adminId;
        const logo = await WebsiteLogoModel.find({ admin });
        if (logo.length === 0) {
            return res.status(400).json({ message: "No Logo Found" });
        }
        return res.status(200).json({ message: "Data Sent Successfully", data: logo });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const createWebsiteColor = async (req, res) => {
    try {
        const { color } = req.body;
        const existingColor = await WebsiteColorModel.find({ color, admin: req.adminId });
        if (existingColor.length > 0) {
            return res.status(400).json({ message: "Color Already Exists" });
        }
        const data = new WebsiteColorModel({ color, admin: req.adminId });
        await data.save();
        return res.status(200).json({ message: "Color Added Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAllWebsiteColors = async (req, res) => {
    try {
        const colors = await WebsiteColorModel.find({ admin: req.adminId });
        if (colors?.length === 0) {
            return res.status(400).json({ message: "No Color Found" });
        }
        return res.status(200).json({ message: "Data Fecthed Successfully", data: colors });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getActiveWebsiteColor = async (req, res) => {
    try {
        const admin = req.adminId;
        const color = await WebsiteColorModel.find({ status: true, admin });
        if (color?.length === 0) {
            return res.status(400).json({ message: "No Active Color Found" });
        }
        return res.status(200).json({ message: "Data Fetched Successfully", data: color });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const updateWebsiteColor = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "No ID Found" });
        }
        const color = await WebsiteColorModel.findById(id);
        if (!color) {
            return res.status(400).json({ message: "ID was Wrong" });
        }
        await WebsiteColorModel.updateMany({ admin: color.admin, status: true }, { status: false });
        await WebsiteColorModel.findByIdAndUpdate(id, { status: true });
        return res.status(200).json({ message: "Website Color Updated" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const deleteWebsiteColor = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "No ID Found" });
        }
        const color = await WebsiteColorModel.findByIdAndDelete(id);
        if (!color) {
            return res.status(400).json({ message: "ID was Wrong" });
        }
        return res.status(200).json({ message: "Website Color Deleted" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const createWebsiteBanner = async (req, res) => {
    try {
        const id = req.adminId;
        const image = req.file;
        if (!image) {
            return res.status(400).json({ message: "No Banner Provided" });
        }
        const data = new WebsiteBannerModel({ image: image.path, admin: id });
        await data.save();
        return res.status(200).json({ message: "Website Banner Added" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getWebsiteBanner = async (req, res) => {
    try {
        const data = await WebsiteBannerModel.find();
        if (data?.length === 0) {
            return res.status(400).json({ message: "No Website Banner Found" });
        }
        return res.status(200).json({ message: "Data Fetched Successfully", data });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getWebsiteBannerByAdmin = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const id = decoded?.id || decoded?.adminId;
        const data = await WebsiteBannerModel.find({ admin: id });
        if (data?.length === 0) {
            return res.status(400).json({ message: "No Website Banner Found" });
        }
        return res.status(200).json({ message: "Data Fetched Successfully", data });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getWebsiteBannerByWebsite = async (req, res) => {
    try {
        const data = await WebsiteBannerModel.find({ admin: req.adminId });
        if (data?.length === 0) {
            return res.status(400).json({ message: "No Website Banner Found" });
        }
        return res.status(200).json({ message: "Data Fetched Successfully", data });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const deleteWebsiteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await WebsiteBannerModel.findByIdAndDelete(id);
        if (!data) {
            return res.status(400).json({ message: "No Website Banner Found" });
        }
        return res.status(200).json({ message: "Data Deleted Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const createBetDelay = async (req, res) => {
    try {
        const id = req.adminId;

        let existingBetDelay = await BetDelayModel.findOne({ $or: [{ admin: id }, { admin: req.query.id }] });

        if (existingBetDelay) {
            existingBetDelay = await BetDelayModel.findByIdAndUpdate(
                existingBetDelay._id,
                { ...req.body },
                { new: true }
            );
            return res.status(200).json({ message: "Bet Delay Updated", data: existingBetDelay });
        } else {
            const newBetDelay = new BetDelayModel({ admin: req.query.id || id, ...req.body });
            const data = await newBetDelay.save();
            return res.status(200).json({ message: "Bet Delay Created", data });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getBetDelayByAdmin = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token || token === "") {
            return res.status(400).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const id = decoded?.id || decoded?.adminId;

        const existingBetDelay = await BetDelayModel.findOne({ admin: id });

        if (existingBetDelay) {
            return res.status(200).json({ message: "Bet Delay Found", data: existingBetDelay });
        } else {
            return res.status(404).json({ message: "No Bet Delay Found for this admin" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createColor,
    getAllColors,
    getActiveColors,
    deleteColor,
    updateStatus,
    changeName,
    getWebsiteName,
    changeWebsiteLogo,
    getWebsiteLogo,
    createWebsiteColor,
    getAllWebsiteColors,
    getActiveWebsiteColor,
    updateWebsiteColor,
    deleteWebsiteColor,
    createWebsiteBanner,
    getWebsiteBanner,
    getWebsiteBannerByAdmin,
    deleteWebsiteBanner,
    createBetDelay,
    getBetDelayByAdmin,
    getWebsiteBannerByWebsite
};