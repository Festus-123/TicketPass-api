import db from "../config/db.js";

export async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      organizer_id INT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      venue VARCHAR(200) NOT NULL,
      event_date TIMESTAMP NOT NULL,
      ticket_price DECIMAL(10,2) DEFAULT 0,
      total_seats INTEGER NOT NULL,
      available_seats INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down() {
  await db.query(`DROP TABLE IF EXISTS events;`);
}

up();
