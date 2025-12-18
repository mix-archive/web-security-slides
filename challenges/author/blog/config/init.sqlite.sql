-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO users (id, username, email, password, is_admin)
VALUES (1, 'admin', 'admin@rois.team', '$2y$10$w56aNQmssUmb5h9e.BdYpOXoU38suUJQ7ACZVhs2XTz8zLtGhDlpi', 1);

INSERT OR IGNORE INTO articles (id, user_id, title, subtitle, content, status, views, created_at, updated_at)
VALUES (2348385096957952, 1, 'Welcome to RCTF2025!', '', 'Welcome to RCTF2025!', 'approved', 1, '2025-11-15 10:00:00', '2025-11-15 10:00:00');

