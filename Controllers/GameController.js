const fs = require('fs');
const path = require('path');
const jwt = require("jsonwebtoken");
const gameModel = require("../Models/GameModel.js");
const adminModel = require('../Models/AdminModel.js');

const createGame = async (req, res) => {
    try {
        const image = req.file;
        const { name } = req.body;

        const existingGame = await gameModel.findOne({ name });
        if (existingGame) {
            return res.status(409).json({ message: "Game already exists" });
        }

        const game = new gameModel({
            name,
            image: image.path,
            admins: [],
            adminCommision: req.body.adminCommision
        });

        await game.save();
        return res.status(200).json({ message: "Game added successfully", game });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAllGames = async (req, res) => {
    try {
        if (req.adminId) {
            // Find games where the adminId is part of the admins array
            const games = await gameModel.find({ admins: { $elemMatch: { admin: req.adminId } } });

            if (games.length === 0) {
                return res.status(400).json({ message: "Games are Empty" });
            }

            // Update the games to include only the requested admin's data in the admins array
            const updatedGames = games.map((game) => {
                // Filter the admins array to find the admin with the given adminId
                const adminData = game.admins.find((admin) => admin.admin.toString() === req.adminId.toString());

                // If adminData is found, return the game with that admin data
                return {
                    ...game.toObject(), // Convert the Mongoose object to a plain JavaScript object
                    admins: adminData ? [adminData] : [] // Only include the matched admin's data
                };
            });

            return res.status(200).json({ message: "Data Sent Successfully", data: updatedGames });
        } else {
            // If no adminId, return all games with all admins
            const games = await gameModel.find();

            if (games.length === 0) {
                return res.status(400).json({ message: "Games are Empty" });
            }

            return res.status(200).json({ message: "Data Sent Successfully", data: games });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const getAvailableGames = async (req, res) => {
    try {
        const id = req.adminId;
        const games = await gameModel.find({
            disabled: false,
            admins: { $elemMatch: { admin: id, status: true } },
        });
        if (games.length === 0) {
            return res.status(400).json({ message: "Games are Empty" });
        }

        const data = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));
        const availableGames = games.filter(game => {
            return data.some(redisGame => redisGame.game === game.name);
        })

        const competitionData = JSON.parse(fs.readFileSync('./JSON_DATA/competition_data.json', 'utf8'));
        const gamesWithCompetitions = availableGames.map(game => {
            const competitions = competitionData.filter(competition => competition.sport.toLowerCase() === game.name.toLowerCase());
            return { ...game.toObject(), competitionsData: competitions };
        });

        return res.status(200).json({ message: "Data Sent Successfully", data: gamesWithCompetitions });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const deleteGame = async (req, res) => {
    try {
        const { id } = req.params;
        const game = await gameModel.findById(id);
        if (!game) {
            return res.status(400).json({ message: "Wrong Game Id" });
        }
        const imagePath = path.join(__dirname, '..', game.image);
        await gameModel.findByIdAndDelete(id);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.log(err);
                // return res.status(500).json({ message: "Error deleting image file" });
            }
        });
        return res.status(200).json({ message: "Game Deleted Successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" })
    }
};

const updateStatus = async (req, res) => {
    try {
        const { value } = req.body;
        const { id } = req.params;
        const adminId = req.adminId;
        const game = await gameModel.findById(id);

        if (!game) {
            return res.status(400).json({ message: "Game not found" });
        }

        if (adminId) {
            const adminIndex = game.admins.findIndex(admin => admin.admin.equals(adminId));

            if (adminIndex !== -1) {
                game.admins[adminIndex].status = value;
                await game.save();
                return res.status(200).json({ message: "Admin status updated" });
            } else {
                game.disabled = value;
                await game.save();
                return res.status(200).json({ message: "Game disabled status updated" });
            }
        } else {
            game.disabled = value;
            await game.save();
            return res.status(200).json({ message: "Game disabled status updated" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

const updateGame = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};

        if (req.body.name !== undefined) {
            updates.name = req.body.name;
        }

        if (req.file) {
            updates.image = req.file.path;
        }

        if (req.body.disabled !== undefined) {
            updates.disabled = req.body.disabled;
        }

        if (req.body.admins) {
            updates.admins = JSON.parse(req.body.admins);
        }

        if (req.body.adminCommision !== undefined) {
            updates.adminCommision = req.body.adminCommision;
        }

        const game = await gameModel.findByIdAndUpdate(id, updates, { new: true });
        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }

        return res.status(200).json({ message: "Game updated successfully", game });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
    }
};

module.exports = {
    createGame,
    getAllGames,
    deleteGame,
    updateStatus,
    getAvailableGames,
    updateGame
};

// ======================================================================

// const fs = require('fs');
// const path = require('path');
// const jwt = require("jsonwebtoken");
// const gameModel = require("../Models/GameModel.js");
// const adminModel = require('../Models/AdminModel.js');

// const createGame = async (req, res) => {
//     try {
//         const image = req.file;
//         const { name } = req.body;
//         const admin = await adminModel.findById(req.adminId);
//         if (!admin.verified) {
//             return res.status(400).json({ message: "Failed" });
//         }
//         const existingGame = await gameModel.findOne({ name });
//         if (existingGame) {
//             return res.status(409).json({ message: "Game already exists" });
//         }
//         const game = new gameModel({
//             name,
//             image: image.path,
//             admin: admin._id,
//             adminCommision: req.body.adminCommision
//         });
//         await game.save();
//         return res.status(200).json({ message: "Game added successfully", game });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Server Error!" });
//     }
// };

// const getAllGames = async (req, res) => {
//     try {
//         const games = await gameModel.find({ admin: req.adminId });
//         if (games.length === 0) {
//             return res.status(400).json({ message: "Games are Empty" });
//         }
//         return res.status(200).json({ message: "Data Sent Successfully", data: games });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Server Error!" })
//     }
// };

// const getAvailableGames = async (req, res) => {
//     try {
//         const id = req.adminId;
//         const games = await gameModel.find({ disabled: false, admin: id });
//         if (games.length === 0) {
//             return res.status(400).json({ message: "Games are Empty" });
//         }

//         const data = JSON.parse(fs.readFileSync('./JSON_DATA/games_list.json', 'utf8'));
//         const availableGames = games.filter(game => {
//             return data.some(redisGame => redisGame.game === game.name);
//         })

//         const competitionData = JSON.parse(fs.readFileSync('./JSON_DATA/competition_data.json', 'utf8'));
//         const gamesWithCompetitions = availableGames.map(game => {
//             const competitions = competitionData.filter(competition => competition.sport.toLowerCase() === game.name.toLowerCase());
//             return { ...game.toObject(), competitionsData: competitions };
//         });

//         return res.status(200).json({ message: "Data Sent Successfully", data: gamesWithCompetitions });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Server Error!" })
//     }
// };

// const deleteGame = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const game = await gameModel.findById(id);
//         if (!game) {
//             return res.status(400).json({ message: "Wrong Game Id" });
//         }
//         const imagePath = path.join(__dirname, '..', game.image);
//         await gameModel.findByIdAndDelete(id);
//         fs.unlink(imagePath, (err) => {
//             if (err) {
//                 console.log(err);
//                 // return res.status(500).json({ message: "Error deleting image file" });
//             }
//         });
//         return res.status(200).json({ message: "Game Deleted Successfully" });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Server Error!" })
//     }
// };

// const updateStatus = async (req, res) => {
//     try {
//         const { value } = req.body;
//         const { id } = req.params;
//         const game = await gameModel.findByIdAndUpdate(id, { disabled: value });
//         if (!game) {
//             return res.status(400).json({ message: "Game not found" });
//         }
//         return res.status(200).json({ message: "Game Updated" });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Server Error!" })
//     }
// };

// module.exports = {
//     createGame,
//     getAllGames,
//     deleteGame,
//     updateStatus,
//     getAvailableGames
// };