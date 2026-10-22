const { asyncHandler } = require('../utils/errors');
const slots = require('../utils/slotBetting');

exports.wallet = asyncHandler(async (req, res) => res.json({ success: true, data: slots.getWallet(req.user.id) }));
exports.bet = asyncHandler(async (req, res) => {
  const data = slots.placeBet({ userId: req.user.id, amount: req.body?.stake, idempotencyKey: req.get('Idempotency-Key') });
  res.status(data.replayed ? 200 : 201).json({ success: true, data });
});
exports.claim = asyncHandler(async (req, res) => res.json({ success: true, data: slots.claimReward({ userId: req.user.id, claimId: req.params.id }) }));

