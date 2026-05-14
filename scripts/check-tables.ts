import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
const [rows] = await conn.query("SHOW TABLES");
console.log("Tables:", (rows as Record<string, string>[]).map((r) => Object.values(r)[0]));
await conn.end();
process.exit(0);
