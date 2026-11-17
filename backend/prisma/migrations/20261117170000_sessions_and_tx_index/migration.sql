-- Durable express-session store (connect-pg-simple).
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");

-- Speeds period filters used by reports, insights and the assistant.
CREATE INDEX IF NOT EXISTS "transactions_user_id_date_idx" ON "transactions" ("user_id", "date");
