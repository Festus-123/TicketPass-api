import db from "../config/db.js";

export const UserModel = {
    async findByEmail(email){
        const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
        return result.rows[0]
    },

    async create({name, email, passwordHash, role}) {
        const result = await db.query('INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role, created_at', 
            [name, email, passwordHash, role]
        )
        return result.rows[0];
    }
}