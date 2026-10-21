const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "clients.db"));

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    company TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'Individual',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const listClients = db.prepare(`
  SELECT * FROM clients
  ORDER BY id DESC
`);
const getClient = db.prepare("SELECT * FROM clients WHERE id = ?");
const insertClient = db.prepare(`
  INSERT INTO clients (client_id, name, phone, email, company, type, address, notes)
  VALUES (@client_id, @name, @phone, @email, @company, @type, @address, @notes)
`);
const updateClient = db.prepare(`
  UPDATE clients
  SET client_id=@client_id, name=@name, phone=@phone, email=@email,
      company=@company, type=@type, address=@address, notes=@notes
  WHERE id=@id
`);

function cleanClient(body) {
  const fields = ["client_id", "name", "phone", "email", "company", "type", "address", "notes"];
  const client = {};
  for (const field of fields) {
    client[field] = String(body[field] ?? "").trim();
  }
  client.type = client.type || "Individual";
  return client;
}

function validate(client) {
  if (!client.client_id) return "Client ID is required.";
  if (!client.name) return "Client name is required.";
  if (!["Individual", "Company", "VIP Client"].includes(client.type)) {
    return "Please choose a valid client type.";
  }
  if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

app.get("/api/clients", (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json(listClients.all());
  const pattern = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM clients
    WHERE client_id LIKE ? OR name LIKE ? OR phone LIKE ?
       OR email LIKE ? OR company LIKE ? OR type LIKE ?
    ORDER BY id DESC
  `).all(pattern, pattern, pattern, pattern, pattern, pattern);
  res.json(rows);
});

app.get("/api/clients/:id", (req, res) => {
  const client = getClient.get(Number(req.params.id));
  if (!client) return res.status(404).json({ error: "Client not found." });
  res.json(client);
});

app.post("/api/clients", (req, res) => {
  const client = cleanClient(req.body);
  const error = validate(client);
  if (error) return res.status(400).json({ error });
  try {
    const result = insertClient.run(client);
    res.status(201).json(getClient.get(result.lastInsertRowid));
  } catch (err) {
    if (String(err.code).includes("CONSTRAINT")) {
      return res.status(409).json({ error: "That Client ID already exists. Please use a unique ID." });
    }
    console.error(err);
    res.status(500).json({ error: "Could not save client." });
  }
});

app.put("/api/clients/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!getClient.get(id)) return res.status(404).json({ error: "Client not found." });
  const client = cleanClient(req.body);
  const error = validate(client);
  if (error) return res.status(400).json({ error });
  try {
    updateClient.run({ ...client, id });
    res.json(getClient.get(id));
  } catch (err) {
    if (String(err.code).includes("CONSTRAINT")) {
      return res.status(409).json({ error: "That Client ID already exists. Please use a unique ID." });
    }
    console.error(err);
    res.status(500).json({ error: "Could not update client." });
  }
});

app.delete("/api/clients/:id", (req, res) => {
  const result = db.prepare("DELETE FROM clients WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Client not found." });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Client Management System is running at http://localhost:${PORT}`);
});
