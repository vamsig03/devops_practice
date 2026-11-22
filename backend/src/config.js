import 'dotenv/config';
//
// All settings come from environment variables (see backend/.env.example).
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 5001,
  jwtSecret: required('JWT_SECRET'),
  database: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: process.env.DB_NAME || 'devops_portal'
  }
};
