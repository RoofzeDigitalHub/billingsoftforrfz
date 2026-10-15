// routes/expenseRoutes.js
const express = require('express');
const controller = require('../controllers/expenseController');

const router = express.Router();

router.get('/types', controller.getTypes);
router.get('/categories', controller.getCategories);
router.post('/categories', controller.createCategory);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.post('/:id/update', controller.update);
router.post('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/delete', controller.delete);

module.exports = router;
