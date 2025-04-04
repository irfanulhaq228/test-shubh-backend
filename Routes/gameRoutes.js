const express = require("express");
const { upload } = require("../Multer/Multer");

const { createGame, getAllGames, deleteGame, updateStatus, getAvailableGames, updateGame } = require("../Controllers/GameController");

const GameRouter = express.Router();

GameRouter.post("/", upload.single('image'), createGame);
GameRouter.get("/", getAllGames);
GameRouter.get("/available", getAvailableGames);

GameRouter.delete("/:id", deleteGame);
GameRouter.post("/status/:id", updateStatus);
GameRouter.patch("/:id", upload.single('image'), updateGame);

module.exports = GameRouter;