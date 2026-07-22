import cron from "node-cron";
import { tick } from "./tick";

const schedule = process.env.SCHEDULER_CRON || "* * * * *";

let running = false;

cron.schedule(schedule, () => {
  if (running) return;
  running = true;
  tick()
    .catch((err) => console.error("[scheduler] tick failed", err))
    .finally(() => {
      running = false;
    });
});

console.log(`[scheduler] DOA scheduler started (cron: "${schedule}")`);
