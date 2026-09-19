const express = require('express');
const controller = require('../controllers/reports.controller');

const router = express.Router();

router.post('/', controller.create);

module.exports = router;
