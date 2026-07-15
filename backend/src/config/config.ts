if (!process.env.PORT) {
  throw new Error("PORT is not set");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
if(!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not defined in environment variables");
}
if(!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET is not defined in environment variables");
}
if(!process.env.GOOGLE_REFRESH_TOKEN) {
  throw new Error("GOOGLE_REFRESH_TOKEN is not defined in environment variables");
}
if(!process.env.GOOGLE_USER) {
  throw new Error("GOOGLE_USER is not defined in environment variables");
}
const config = { databaseUrl: process.env.DATABASE_URL, port: process.env.PORT,
  googleConfig: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    googleUser: process.env.GOOGLE_USER,
  }
 };
export default config;
