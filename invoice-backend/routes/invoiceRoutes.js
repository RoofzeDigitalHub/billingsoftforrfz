// routes/invoiceRoutes.js
const express = require('express');
const controller = require('../controllers/invoiceController');

const router = express.Router();

router.get('/', controller.getAll);
router.get('/next-number', controller.nextNumber); // must stay above '/:id'
router.get('/client-milestones', controller.getClientMilestones); // must stay above '/:id'
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);
router.patch('/:id', controller.updateDetails);

module.exports = router;
