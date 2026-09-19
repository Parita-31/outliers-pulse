const express = require('express');
const controller = require('../controllers/resources.controller');

const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
