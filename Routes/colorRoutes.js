const express = require("express");
const { upload } = require("../Multer/Multer");

const { createColor, getAllColors, deleteColor, updateStatus, changeName, getWebsiteName, changeWebsiteLogo, getWebsiteLogo, createWebsiteColor, getAllWebsiteColors, getActiveWebsiteColor, updateWebsiteColor, deleteWebsiteColor, getActiveColors, createWebsiteBanner, getWebsiteBanner, getWebsiteBannerByAdmin, deleteWebsiteBanner, createBetDelay, getBetDelayByAdmin, getWebsiteBannerByWebsite } = require("../Controllers/ColorController");

const WebsiteRouter = express.Router();

WebsiteRouter.post("/color/", createColor);
WebsiteRouter.get("/color/", getAllColors);
WebsiteRouter.get("/color/active", getActiveColors);
WebsiteRouter.delete("/color/:id", deleteColor);
WebsiteRouter.patch("/color/status/:id", updateStatus);

WebsiteRouter.post("/name", changeName);
WebsiteRouter.get("/name", getWebsiteName);

WebsiteRouter.post("/logo", upload.single('image'), changeWebsiteLogo);
WebsiteRouter.get("/logo", getWebsiteLogo);

WebsiteRouter.post("/website-color/", createWebsiteColor);
WebsiteRouter.get("/website-color/", getAllWebsiteColors);
WebsiteRouter.get("/website-color/active/", getActiveWebsiteColor);
WebsiteRouter.patch("/website-color/:id", updateWebsiteColor);
WebsiteRouter.delete("/website-color/:id", deleteWebsiteColor);

WebsiteRouter.post("/banner", upload.single('image'), createWebsiteBanner);
WebsiteRouter.get("/banner", getWebsiteBanner);
WebsiteRouter.get("/banner/admin", getWebsiteBannerByAdmin);
WebsiteRouter.get("/banner/website", getWebsiteBannerByWebsite);
WebsiteRouter.delete("/banner/:id", deleteWebsiteBanner);

WebsiteRouter.post("/betting-time", createBetDelay);
WebsiteRouter.get("/betting-time", getBetDelayByAdmin);

module.exports = WebsiteRouter;