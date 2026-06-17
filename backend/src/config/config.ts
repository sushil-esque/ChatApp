if (!process.env.PORT) {
  throw new Error("PORT is not set");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
const config = { databaseUrl: process.env.DATABASE_URL, port: process.env.PORT };
export default config;
