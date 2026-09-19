const express = require('express');
const controller = require('../controllers/assignments.controller');

const router = express.Router();

router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.post('/:id/approve', controller.approve);

module.exports = router;
