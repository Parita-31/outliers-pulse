const express = require('express');
const controller = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/', controller.get);

module.exports = router;
