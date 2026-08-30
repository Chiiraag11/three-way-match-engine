const express = require('express');
const router = express.Router();
const { computeMatch } = require('../services/matchEngine');

router.get('/:poNumber', async (req, res) => {
  try {
    const result = await computeMatch(req.params.poNumber);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to compute match: ${err.message}` });
  }
});

module.exports = router;
