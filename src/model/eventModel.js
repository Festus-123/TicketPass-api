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
    async getAll () {
        const query =  `
        SELECT * FROM events 
        `
        const result = await db.query(query)
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
    },

    async update (id, newValues) {
        const fieldMapping = {
            title: "title",
            description: "description",
            venue: "venue",
            event_date: "event_date",
            ticket_price: "ticket_price",
            total_seats: "total_seats",
            available_seats: "available_seats"
        }

        const setClause = [];
        const values = [];

        for (const [key, val] of Object.entries(newValues)) {
            const dbColumn = fieldMapping[key]
            if(dbColumn != undefined) {
                values.push(val)
                setClause.push(`${dbColumn} = $${values.length}`)
            }
        }

        if (setClause.length === 0) {
            const exists = this.findById(id);
            return formatEvent(exists)
        }

        values.push(id)
        const query = `
        UPDATE events 
        SET ${setClause.join(", ")}
        WHERE id = $${values.length}
        RETURNING *
        `;

        const result = await db.query(query, values);
        return formatEvent(result.rows[0]);
    },

    async delete (id) {
        const result = await db.query('DELETE FROM events WHERE id = $1', [id])
        return result.rowCount;
    }
}
