// routes/reportRoutes.js
const express = require('express');
const controller = require('../controllers/reportController');

const router = express.Router();

router.get('/client-ledger', controller.getClientLedger);
router.get('/income-expense', controller.getIncomeExpenseReport);

module.exports = router;
