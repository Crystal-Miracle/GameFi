
const crypto = require('crypto');
const store = require('./platform/store');
const { AuthenticationError, AppError } = require('./errors');

const MAX_STAKE_CENTS = 10000;
const INITIAL_BALANCE_CENTS = 100000;

const REELS = ['cherry', 'bell', 'star', 'clover', 'gem'];

const readAmount = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const input = String(value);

  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) {
    return null;
  }

  const [whole, fraction = ''] = input.split('.');
  const cents =
    Number(whole) * 100 +
    Number((fraction + '00').slice(0, 2));

  return Number.isSafeInteger(cents) ? cents : null;
};

const betError = (message, status = 400) => {
  throw new AppError(message, status);
};

const getUser = (state, userId) => {
  const id = String(userId || '');

  if (!id || !state.users.some((user) => user.id === id)) {
    throw new AuthenticationError(
      'Sign in to use the demo wallet'
    );
  }

  let wallet = state.slotWallets.find(
    (item) => item.userId === id
  );

  if (!wallet) {
    wallet = {
      userId: id,
      availableCents: INITIAL_BALANCE_CENTS,
      totalWinningsCents: 0,
      claimableCents: 0,
      bets: [],
      claims: [],
    };

    state.slotWallets.push(wallet);
  }

  return wallet;
};

const summary = (wallet) => ({
  currency: 'BET',

  availableBalance: (wallet.availableCents / 100).toFixed(2),

  totalWinnings: (
    wallet.totalWinningsCents / 100
  ).toFixed(2),

  claimableBalance: (
    wallet.claimableCents / 100
  ).toFixed(2),

  recentBets: wallet.bets
    .slice(-10)
    .reverse()
    .map(({
      id,
      stakeCents,
      reels,
      payoutCents,
      status,
      createdAt,
    }) => ({
      id,
      stake: (stakeCents / 100).toFixed(2),
      reels,
      payout: (payoutCents / 100).toFixed(2),
      status,
      createdAt,
    })),
});

const getWallet = (userId) => {
  const state = store.load();
  const wallet = getUser(state, userId);

  return summary(wallet);
};

const placeBet = ({ userId, amount, idempotencyKey }) =>
  store.mutate((state) => {
    const wallet = getUser(state, userId);

    if (
      typeof idempotencyKey !== 'string' ||
      !/^[\w-]{8,100}$/.test(idempotencyKey)
    ) {
      betError('A valid Idempotency-Key is required');
    }

    const prior = wallet.bets.find(
      (bet) => bet.idempotencyKey === idempotencyKey
    );

    if (prior) {
      if (readAmount(amount) !== prior.stakeCents) {
        betError(
          'Idempotency key was already used for a different stake',
          409
        );
      }

      return {
        bet: {
          ...prior,
          stake: (prior.stakeCents / 100).toFixed(2),
          payout: (prior.payoutCents / 100).toFixed(2),
        },
        wallet: summary(wallet),
        replayed: true,
      };
    }

    const stakeCents = readAmount(amount);

    if (stakeCents === null || stakeCents <= 0) {
      betError(
        'Stake must be a positive amount with at most two decimal places'
      );
    }

    if (stakeCents > MAX_STAKE_CENTS) {
      betError('Maximum stake is 100 BET');
    }

    if (stakeCents > wallet.availableCents) {
      betError('Insufficient BET balance');
    }

    wallet.availableCents -= stakeCents;

    const reels = REELS.map(
      () => REELS[crypto.randomInt(REELS.length)]
    );

    const payoutCents = reels.every(
      (symbol) => symbol === reels[0]
    )
      ? stakeCents * 5
      : 0;

    const bet = {
      id: crypto.randomUUID(),
      idempotencyKey,
      stakeCents,
      reels,
      payoutCents,
      status: 'settled',
      createdAt: new Date().toISOString(),
    };

    wallet.totalWinningsCents += payoutCents;
    wallet.claimableCents += payoutCents;
    wallet.bets.push(bet);

    return {
      bet: {
        ...bet,
        stake: (stakeCents / 100).toFixed(2),
        payout: (payoutCents / 100).toFixed(2),
      },
      wallet: summary(wallet),
      replayed: false,
    };
  });

const claimReward = ({ userId, claimId }) =>
  store.mutate((state) => {
    const wallet = getUser(state, userId);

    const prior = wallet.claims.find(
      (claim) => claim.id === claimId
    );

    if (prior) {
      return {
        ...prior,
        replayed: true,
        wallet: summary(wallet),
      };
    }

    if (!claimId || typeof claimId !== 'string') {
      betError('A valid claim id is required');
    }

    if (wallet.claimableCents <= 0) {
      betError('No rewards are available to claim');
    }

    const amountCents = wallet.claimableCents;

    wallet.availableCents += amountCents;
    wallet.claimableCents = 0;

    const claim = {
      id: claimId,
      amount: (amountCents / 100).toFixed(2),
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    wallet.claims.push(claim);

    return {
      ...claim,
      replayed: false,
      wallet: summary(wallet),
    };
  });

module.exports = {
  getWallet,
  placeBet,
  claimReward,
  readAmount,
  MAX_STAKE_CENTS,
};
