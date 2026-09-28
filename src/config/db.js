import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
const mode = process.env.NODE_ENV;

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl?.includes("neon.tech") || mode === "production"
    ? {rejectUnauthorized: false}
    : false
});

async function dbIsConnected() {
    try {
        const client = await pool.connect();
        await client.query("SELECT version()");
        console.log("Database connected successfully...");
        client.release();
    } catch (error) {
        console.error(`Database connection failed -- Error: ${error.message}`);
    }
}

dbIsConnected();


export default pool;