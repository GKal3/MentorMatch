import { Pool } from "pg";
import "./env.js";

const isProduction = process.env.NODE_ENV === "production";

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER || (isProduction ? undefined : "postgres"),
      host: process.env.DB_HOST || (isProduction ? undefined : "localhost"),
      database: process.env.DB_NAME || (isProduction ? undefined : "dbweb"),
      password: process.env.DB_PASSWORD || (isProduction ? undefined : "postgres"),
      port: Number(process.env.DB_PORT || 5432),
      ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
    };

if (isProduction && !process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error("❌ Config DB mancante: imposta DATABASE_URL oppure DB_HOST/DB_USER/DB_NAME/DB_PASSWORD/DB_PORT");
}

const pool = new Pool(poolConfig);

export default pool;