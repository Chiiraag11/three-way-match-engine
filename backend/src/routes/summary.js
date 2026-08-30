const express = require('express');
const router = express.Router();
const { computeSummary } = require('../services/summaryEngine');

router.get('/:poNumber', async (req, res) => {
  try {
    const result = await computeSummary(req.params.poNumber);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to compute summary: ${err.message}` });
  }
});

module.exports = router;
