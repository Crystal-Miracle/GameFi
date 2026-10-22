const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../middleware/auth');
const slots = require('../../controllers/slots');

const router = express.Router();
const betLimit = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.use(requireAuth);
router.get('/wallet', slots.wallet);
router.post('/bets', betLimit, slots.bet);
router.post('/claims/:id', betLimit, slots.claim);
module.exports = router;