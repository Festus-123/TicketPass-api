import db from "../config/db.js";

export function formatBooking(row) {
  if (!row) return null;

  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    seats_booked: row.seats_booked,
    total_amount: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export const BookingModel = {
    async getAll () {
        const query = `
            SELECT * FROM bookings
        `

        const result = await db.query(query)
        return result.rows.map(formatBooking)
    },

    async getAllMy (userId) {
        const values = [userId];
        const condition = ["user_id = $1"]
        const whereClause = 
            condition.length > 0 ?  `WHERE ${condition.join("AND")}` : "";
        const query = `
            SELECT * FROM bookings
            ${whereClause}
        `

        const result = await db.query(query, values)
        return result.rows.map(formatBooking)
    },

    async findById (id) {
        const result = await db.query('SELECT * FROM bookings WHERE id = $1', [id])
        return result.rows[0]
    },

    async create ({event_id, user_id, seats_booked, total_amount, status }) {
        const result = await db.query(`
            INSERT INTO bookings (event_id, user_id, seats_booked, total_amount, status) VALUES ($1, $2, $3, $4, $5) 
            RETURNING * `, [event_id, user_id, seats_booked, total_amount, status])
        return formatBooking(result.rows[0]);
    }
}