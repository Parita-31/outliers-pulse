const express = require('express');
const controller = require('../controllers/incidents.controller');
const reportsController = require('../controllers/reports.controller');

const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.get('/:id/reports', reportsController.listForIncident);

module.exports = router;
