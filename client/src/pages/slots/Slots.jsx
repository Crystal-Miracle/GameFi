import { useEffect, useMemo, useState } from "react";
import "./Slots.css";
import { Helmet } from "react-helmet-async";

const STARTING_BALANCE = 1000;
const MAX_STAKE = 100;
const PAYOUT_MULTIPLIER = 5;
const readBalance = () => {
  const saved = Number(window.localStorage.getItem("sg-mock-bet-balance"));
  return Number.isFinite(saved) && saved >= 0 ? saved : STARTING_BALANCE;
};

const Slots = () => {
  const [balance, setBalance] = useState(readBalance);
  const [stake, setStake] = useState("10");
  const [busy, setBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimState, setClaimState] = useState("idle");
  const [claimable, setClaimable] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const amount = Number(stake);
  const validation = useMemo(() => {
    if (!stake.trim() || !Number.isFinite(amount)) return "Enter a valid stake amount.";
    if (amount <= 0) return "Stake must be greater than zero.";
    if (amount > MAX_STAKE) return `Maximum stake is ${MAX_STAKE} BET.`;
    if (amount > balance) return "Insufficient balance for this stake.";
    return "";
  }, [amount, balance, stake]);

  const spin = async () => {
    if (busy || validation) return;
    setBusy(true);
    setMessage("");
    setResult(null);
    setClaimState("idle");
    setClaimable(0);
    try {
      // Mock wallet demo
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      const icons = ["🍒", "🍒", "⭐", "🍀", "💎"];
      const reels = Array.from({ length: 3 }, () => icons[Math.floor(Math.random() * icons.length)]);
      const won = reels.every((symbol) => symbol === reels[0]);
      const winnings = won ? amount * PAYOUT_MULTIPLIER : 0;
      const nextBalance = balance - amount;
      window.localStorage.setItem("sg-mock-bet-balance", String(nextBalance));
      setBalance(nextBalance);
      setClaimable(winnings);
      setResult({ reels, won, winnings });
      setMessage(won ? `You won ${winnings} BET!` : `No match this time. ${amount} BET  used.`);
    } catch {
      setMessage("Spin failed. Your balance  not changed. try again.");
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    if (!claimable || claimBusy) return;
    setClaimBusy(true);
    setClaimState("pending");
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    try {
      const nextBalance = balance + claimable;
      window.localStorage.setItem("sg-mock-bet-balance", String(nextBalance));
      setBalance(nextBalance);
    } catch {
      setClaimState("error");
      setClaimBusy(false);
      return;
    }
    setClaimable(0);
    setClaimState("success");
    setClaimBusy(false);
  };

  const resetDemo = () => {
    if (busy || claimBusy) return;
    window.localStorage.removeItem("sg-mock-bet-balance");
    setBalance(STARTING_BALANCE);
    setResult(null);
    setClaimable(0);
    setClaimState("idle");
    setMessage("Demo balance reset to 1,000 BET.");
  };

  return (
    <>
      <Helmet><title>GalaxyGameFi | Slots</title><meta name="description" content="Play slots with a mock BET wallet" /></Helmet>

      <section id="slotsPage" className="mt-3 mb-5">
           <div className="container slotsShell">
              <header className="slotsHeading">
                <div><span className="slotsEyebrow">GAME ROOM · DEMO</span><h1 className="sg-game-title">Galaxy Slots</h1>
                  <p className="sg-game-subtitle">Spin the reels. Every result uses your mock BET balance.</p></div>
                <aside className="mockWallet" aria-label="Mock BET wallet balance"><span>MOCK WALLET</span><strong>{balance.toLocaleString()} <small>BET</small></strong><button type="button" onClick={resetDemo} disabled={busy || claimBusy}>Reset demo balance</button></aside>
              </header>
              <div className="slotsLayout">
                <main className="slotMachine cardShell" aria-label="Slot machine">
                  <div className="machineTop"><span>GALAXY JACKPOT</span><span>3 REELS</span></div>
                  <div className="slotReels" aria-live="polite" aria-label={result ? `Result: ${result.reels.join(" ")}` : "Slot reels ready"}>
                    {(result?.reels || ["🍒", "⭐", "💎"]).map((symbol, index) => <span className="slotReel" key={`${index}-${symbol}`}>{symbol}</span>)}
                  </div>
                  <div className="machinePayline">MATCH THREE · 5× PAYOUT</div>
                  <div className="betControls">
                    <label htmlFor="slotStake">Your stake <span>BET</span></label>
                    <div className="stakeRow"><input id="slotStake" inputMode="decimal" type="number" min="0.01" max={MAX_STAKE} step="0.01" value={stake} onChange={(event) => setStake(event.target.value)} aria-describedby="stakeHelp stakeError" />
                      <button className="spinButton" type="button" onClick={spin} disabled={busy || Boolean(validation)}>{busy ? "Spinning…" : "SPIN"}</button></div>
                    <div id="stakeHelp" className="stakeHelp">Estimated reward: <strong>{Number.isFinite(amount) && amount > 0 ? (amount * PAYOUT_MULTIPLIER).toLocaleString() : "—"} BET</strong> · maximum stake {MAX_STAKE} BET</div>
                    <div id="stakeError" className="validationNote" role="status">{validation || ""}</div>
                  </div>
                </main>
                <aside className="gameSide cardShell">
                  <h2>Round summary</h2><div className="summaryLine"><span>Stake</span><strong>{result ? `${amount} BET` : "—"}</strong></div>
                  <div className="summaryLine"><span>Reward</span><strong className={result?.won ? "winText" : ""}>{result ? `${result.winnings} BET` : "—"}</strong></div>
                  {result && <div className={`resultBanner ${result.won ? "isWin" : "isLoss"}`} role="status">{result.won ? "Three of a kind — winner!" : "No match — try another spin."}</div>}
                  {message && <p className="slotMessage" role="status">{message}</p>}
                  <button type="button" className="claimButton" onClick={claim} disabled={!claimable || claimBusy} aria-describedby="claimStatus">{claimBusy ? "Claim pending…" : claimState === "success" ? "Reward claimed" : `Claim ${claimable ? `${claimable} BET` : "reward"}`}</button>
                  <p id="claimStatus" className={`claimStatus ${claimState}`} aria-live="polite">{claimState === "pending" ? "Claim is processing…" : claimState === "success" ? "Reward successfully claimed to your mock wallet." : claimState === "error" ? "Claim could not be saved. Your balance is unchanged; retry the claim." : claimable ? "Your win is ready to claim." : "A winning spin makes a reward available here."}</p>
                </aside>
              </div>
              <p className="demoNotice">Mock wallet only — no real tokens, deposits, or withdrawals. Demo balance is stored in this browser.</p>
            </div>
      </section>
    </>
  );
};

export default Slots;