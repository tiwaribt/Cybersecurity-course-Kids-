import Database from 'better-sqlite3';

const db = new Database('meridian.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'student',
    full_name TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade INTEGER,
    title_en TEXT,
    title_ne TEXT,
    description_en TEXT,
    description_ne TEXT
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    order_index INTEGER,
    title_en TEXT,
    title_ne TEXT,
    content_en TEXT,
    content_ne TEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER,
    lesson_id INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, lesson_id)
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER,
    title_en TEXT,
    title_ne TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER,
    question_en TEXT,
    question_ne TEXT,
    option_a_en TEXT,
    option_a_ne TEXT,
    option_b_en TEXT,
    option_b_ne TEXT,
    option_c_en TEXT,
    option_c_ne TEXT,
    option_d_en TEXT,
    option_d_ne TEXT,
    correct_option TEXT, -- 'A', 'B', 'C', or 'D'
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_scores (
    user_id INTEGER,
    quiz_id INTEGER,
    score INTEGER,
    total INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, quiz_id)
  );

  CREATE TABLE IF NOT EXISTS certificate_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    school_name TEXT DEFAULT 'Meridian International School',
    signatory_name TEXT DEFAULT 'Principal',
    signatory_title TEXT DEFAULT 'Head of School',
    signature_base64 TEXT
  );

  -- Insert default admin if not exists
  INSERT OR IGNORE INTO users (username, password, role, full_name) 
  VALUES ('admin', 'admin123', 'admin', 'System Administrator');

  -- Insert default certificate settings
  INSERT OR IGNORE INTO certificate_settings (id, school_name, signatory_name, signatory_title)
  VALUES (1, 'Meridian International School', 'Dr. S. Sharma', 'Principal');
`);

export default db;
