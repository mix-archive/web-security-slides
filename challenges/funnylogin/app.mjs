import express, { urlencoded, static as serveStatic } from "express";
import { randomUUID, randomBytes } from "node:crypto";
import initSqlJs from "sql.js";
import fs from "node:fs/promises";
import path from "node:path";

const app = express();

// Initialize SQLite WASM
async function initializeDb() {
  const SQL = await initSqlJs();
  let db;

  try {
    // Try to load existing database if it exists
    const filebuffer = await fs.readFile(
      path.join(process.cwd(), "db.sqlite3"),
    );
    db = new SQL.Database(filebuffer);
  } catch (err) {
    // Create a new database if the file doesn't exist
    db = new SQL.Database();
  }

  // Reset and create tables
  db.exec(`DROP TABLE IF EXISTS users;`);
  db.exec(`CREATE TABLE users(
      id INTEGER PRIMARY KEY,
      username TEXT,
      password TEXT
  );`);

  const FLAG = process.env.FLAG || "dice{test_flag}";
  const PORT = process.env.PORT || 3000;

  const users = [...Array(100_000)].map(() => ({
    user: `user-${randomUUID()}`,
    pass: randomBytes(8).toString("hex"),
  }));

  // Insert users in batches to avoid memory issues
  const BATCH_SIZE = 1000;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    db.exec(
      `INSERT INTO users (id, username, password) VALUES ${batch.map((u, idx) => `(${i + idx}, '${u.user}', '${u.pass}')`).join(", ")}`,
    );
  }

  // Save the database to a file
  const data = db.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(path.join(process.cwd(), "db.sqlite3"), buffer);

  const isAdmin = {};
  const newAdmin = users[Math.floor(Math.random() * users.length)];
  isAdmin[newAdmin.user] = true;

  app.use(urlencoded({ extended: false }));
  app.use(serveStatic("public"));

  app.post("/api/login", async (req, res) => {
    const { user, pass } = req.body;

    const query = `SELECT id FROM users WHERE username = '${user}' AND password = '${pass}';`;
    try {
      // Re-open the database for each query to ensure data consistency
      const filebuffer = await fs.readFile(
        path.join(process.cwd(), "db.sqlite3"),
      );
      const queryDb = new SQL.Database(filebuffer);

      const result = queryDb.exec(query);
      const id =
        result.length > 0 && result[0].values.length > 0
          ? result[0].values[0][0]
          : null;

      if (!id) {
        return res.redirect("/?message=Incorrect username or password");
      }

      if (users[id] && isAdmin[user]) {
        return res.redirect("/?flag=" + encodeURIComponent(FLAG));
      }
      return res.redirect(
        "/?message=This system is currently only available to admins...",
      );
    } catch (err) {
      console.error(err);
      return res.redirect("/?message=Nice try...");
    }
  });

  app.listen(PORT, () =>
    console.log(`web/funnylogin listening on port ${PORT}`),
  );
}

// Start the application
initializeDb().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
