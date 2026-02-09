import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "dbweb",
  password: "131103Giuk",
  port: 5432,
});

export default pool;