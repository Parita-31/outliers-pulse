const express = require('express');
const controller = require('../controllers/incidents.controller');
const reportsController = require('../controllers/reports.controller');
const recommendationsController = require('../controllers/recommendations.controller');

const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.get('/:id/reports', reportsController.listForIncident);
router.post('/:id/analyze', controller.analyze);
router.post('/:id/merge', controller.merge);
router.get('/:id/recommendations', recommendationsController.getForIncident);
router.post('/:id/simulate-resource-failure', controller.simulateFailure);
router.post('/:id/recover', controller.recover);
router.post('/:id/briefing', controller.getBriefing);

module.exports = router;