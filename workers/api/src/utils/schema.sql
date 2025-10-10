-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  createdAt TEXT NOT NULL
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  system TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  heatEnabled INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  options TEXT,
  createdAt TEXT NOT NULL
);

-- Memberships
CREATE TABLE IF NOT EXISTS memberships (
  userId TEXT NOT NULL,
  gameId TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (userId, gameId)
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  trope TEXT,
  feats TEXT,
  attributes TEXT NOT NULL, -- JSON
  skills TEXT NOT NULL,     -- JSON
  resources TEXT,           -- JSON
  gear TEXT,                -- JSON/CSV
  conditions TEXT,          -- JSON
  notes TEXT,
  revision INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  characterId TEXT,
  content TEXT NOT NULL,
  embeds TEXT,     -- JSON
  versions TEXT,   -- JSON
  editedAt TEXT,
  createdAt TEXT NOT NULL
);

-- Rolls
CREATE TABLE IF NOT EXISTS rolls (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL,
  actorId TEXT NOT NULL,
  characterId TEXT,
  type TEXT NOT NULL,
  tags TEXT,       -- JSON array
  pool TEXT NOT NULL,     -- JSON array
  result TEXT NOT NULL,   -- JSON object
  luckSpent INTEGER,
  rerolls TEXT,           -- JSON array of arrays
  createdAt TEXT NOT NULL
);

-- Clocks
CREATE TABLE IF NOT EXISTS clocks (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL,
  label TEXT NOT NULL,
  max INTEGER NOT NULL,
  value INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_game_time ON messages (gameId, createdAt);
