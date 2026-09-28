import db from "../config/db.js";

export function formatEvent(row) {
  if (!row) return null;

  return {
    id: row.id,
    organizer_id: row.organizer_id,
    title: row.title,
    description: row.description,
    venue: row.venue,
    event_date: row.event_date ? new Date(row.event_date) : null,
    ticket_price: Number(row.ticket_price),
    total_seats: Number(row.total_seats),
    available_seats: Number(row.available_seats),
    // userId: row.user_id || row.user,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export const EventModel = {
    async getAll (organizerId) {
        const values = [organizerId];
        const condition = ["organizer_id = $1"]
        // condition.push(['organiser_id = '])
        const whereClause = 
            condition.length > 0 ? `WHERE ${condition.join("AND")}` : "";
        const query =  `
        SELECT * FROM events 
        ${whereClause}
        `

        const result = await db.query(query, values)
        return result.rows.map(formatEvent)
    },

    async findById (id) {
        const result = await db.query('SELECT * FROM events WHERE id = $1', [id])
        return result.rows[0]
    },

    async create ({ organizer_id, title, description, venue, event_date, ticket_price, total_seats, available_seats}) {
        const result = await db.query(
            `INSERT INTO events (organizer_id, title, description, venue, event_date, ticket_price, total_seats, available_seats)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `, [organizer_id, title, description, venue, event_date, ticket_price, total_seats, available_seats]
        );
        return formatEvent(result.rows[0])
    }
}
