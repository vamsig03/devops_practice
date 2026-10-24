// Learning setup: replace these values with your RDS/MySQL credentials.
// For a real production app, move secrets to environment variables or AWS Secrets Manager.
export const config = {
  port: 5000,
  jwtSecret: 'replace-this-with-a-long-random-secret-before-deploying',
  database: {
    host: 'YOUR_DATABASE_HOST',
    port: 3306,
    user: 'YOUR_DATABASE_USER',
    password: 'YOUR_DATABASE_PASSWORD',
    database: 'devops_portal'
  }
};

