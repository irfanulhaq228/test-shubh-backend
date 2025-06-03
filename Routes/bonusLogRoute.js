const express = require('express')
const { getAllBonusLog, adminLogs, userLogs, masterLogs } = require('../Controllers/BonusLogController')

const bonusLogRouter = express.Router()

bonusLogRouter.get('/getAll', getAllBonusLog)
bonusLogRouter.get('/getMaster', masterLogs)
bonusLogRouter.get('/getUser', userLogs)
bonusLogRouter.get('/getAdmin', adminLogs)


module.exports = bonusLogRouter