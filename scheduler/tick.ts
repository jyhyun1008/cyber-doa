import { checkRoutines } from "./checks/routines";
import { checkSchedules } from "./checks/schedules";
import { checkDeadlines } from "./checks/deadlines";
import { checkIdle } from "./checks/idle";

export async function tick() {
  const now = new Date();
  await checkRoutines(now);
  await checkSchedules(now);
  await checkDeadlines(now);
  await checkIdle(now);
}
