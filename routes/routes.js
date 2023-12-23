const express = require("express")
const router = express.Router()

const { catchSpecialCharacters } = require("../middleware/middleware.js")
const { CreateTask, GetTaskbyState, PromoteTask2Done } = require("../controllers/controllers.js")

router.use(catchSpecialCharacters)

router.route("/CreateTask").post(CreateTask)
router.route("/GetTaskbyState").post(GetTaskbyState)
router.route("/PromoteTask2Done").post(PromoteTask2Done)

module.exports = router
