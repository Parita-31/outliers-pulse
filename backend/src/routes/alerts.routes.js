const express = require('express');
const controller = require('../controllers/alerts.controller');

const router = express.Router();

router.get('/', controller.list);
router.patch('/:id/acknowledge', controller.acknowledge);

module.exports = router;
