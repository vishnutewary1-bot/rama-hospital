const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Store = require('electron-store');

// Initialize electron store for app settings
const store = new Store();

// Database instance
let db = null;

// Get user data path for database storage
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'rama-hospital.db');
const backupDir = path.join(userDataPath, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Initialize database
function initializeDatabase() {
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run migrations
    runMigrations();

    console.log('Database initialized successfully at:', dbPath);
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// Run database migrations
function runMigrations() {
  const migrationPath = path.join(__dirname, 'migrations');

  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Get applied migrations
  const applied = db.prepare('SELECT name FROM migrations').all().map(m => m.name);

  // Read and apply pending migrations
  if (fs.existsSync(migrationPath)) {
    const files = fs.readdirSync(migrationPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!applied.includes(file)) {
        const sql = fs.readFileSync(path.join(migrationPath, file), 'utf-8');
        db.exec(sql);
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        console.log('Applied migration:', file);
      }
    }
  } else {
    // Run initial schema
    runInitialSchema();
  }
}

// Run initial database schema
function runInitialSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(sql);
    console.log('Initial schema applied');
  }
}

// Create main window
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false
  });

  // Load the app
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../.next/server/app/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

// ==================== IPC HANDLERS ====================

// Authentication
ipcMain.handle('auth:login', async (event, { email, password }) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:logout', async () => {
  store.delete('session');
  return { success: true };
});

ipcMain.handle('auth:getSession', async () => {
  const session = store.get('session');
  return session || null;
});

ipcMain.handle('auth:setSession', async (event, session) => {
  store.set('session', session);
  return { success: true };
});

// Generic CRUD operations
ipcMain.handle('db:query', async (event, { sql, params = [] }) => {
  try {
    const stmt = db.prepare(sql);
    const isSelect = sql.trim().toLowerCase().startsWith('select');

    if (isSelect) {
      const results = params.length > 0 ? stmt.all(...params) : stmt.all();
      return { success: true, data: results };
    } else {
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();
      return { success: true, data: result };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:get', async (event, { sql, params = [] }) => {
  try {
    const stmt = db.prepare(sql);
    const result = params.length > 0 ? stmt.get(...params) : stmt.get();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:run', async (event, { sql, params = [] }) => {
  try {
    const stmt = db.prepare(sql);
    const result = params.length > 0 ? stmt.run(...params) : stmt.run();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:transaction', async (event, { queries }) => {
  const transaction = db.transaction(() => {
    const results = [];
    for (const { sql, params = [] } of queries) {
      const stmt = db.prepare(sql);
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      if (isSelect) {
        results.push(params.length > 0 ? stmt.all(...params) : stmt.all());
      } else {
        results.push(params.length > 0 ? stmt.run(...params) : stmt.run());
      }
    }
    return results;
  });

  try {
    const results = transaction();
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Backup & Restore
ipcMain.handle('backup:create', async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    await db.backup(backupPath);

    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:restore', async (event, backupPath) => {
  try {
    // Close current database
    db.close();

    // Copy backup to main database
    fs.copyFileSync(backupPath, dbPath);

    // Reinitialize database
    initializeDatabase();

    return { success: true };
  } catch (error) {
    // Try to reinitialize original database
    initializeDatabase();
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:list', async () => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        date: fs.statSync(path.join(backupDir, f)).mtime
      }))
      .sort((a, b) => b.date - a.date);

    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Database', extensions: ['db'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.handle('backup:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `rama-hospital-backup-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'Database', extensions: ['db'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
      await db.backup(result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

// Utility functions
ipcMain.handle('util:generateUUID', async () => {
  return uuidv4();
});

ipcMain.handle('util:hashPassword', async (event, password) => {
  return bcrypt.hashSync(password, 10);
});

ipcMain.handle('util:getAppInfo', async () => {
  return {
    version: app.getVersion(),
    dbPath,
    userDataPath,
    platform: process.platform
  };
});

// Settings
ipcMain.handle('settings:get', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('settings:set', async (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

ipcMain.handle('settings:getAll', async () => {
  return store.store;
});
