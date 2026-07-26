// Dumps the pre-multiuser (single AppUser id=1) database to JSON using raw SQL —
// deliberately does NOT use the Prisma client, so it works no matter what
// schema.prisma currently says (safe to run right after `git pull`, before migrating).
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("사용법: tsx 01-dump-raw.ts <path-to-old-doa.db>");
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error("파일을 찾을 수 없어요:", dbPath);
  process.exit(1);
}

const outPath = path.join(path.dirname(dbPath), "multiuser-migration-dump.json");

const db = new Database(dbPath, { readonly: true });

const appUser = db.prepare("SELECT * FROM AppUser LIMIT 1").get();
const messages = db.prepare("SELECT * FROM Message").all();
const todos = db.prepare("SELECT * FROM Todo").all();
const routines = db.prepare("SELECT * FROM Routine").all();
const schedules = db.prepare("SELECT * FROM Schedule").all();
const pushSubscriptions = db.prepare("SELECT * FROM PushSubscription").all();

db.close();

const dump = { appUser, messages, todos, routines, schedules, pushSubscriptions };
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));

console.log("Dumped to", outPath);
console.log({
  appUser: appUser ? 1 : 0,
  messages: messages.length,
  todos: todos.length,
  routines: routines.length,
  schedules: schedules.length,
  pushSubscriptions: pushSubscriptions.length,
});
