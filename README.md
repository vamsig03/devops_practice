# Launchpad — React + Express + MySQL on EC2

A complete learning project with registration, login, JWT authentication, a protected dashboard, automatic table creation, and an EC2-ready Nginx/PM2 setup.

## Project layout

- `frontend/` — React + Vite UI
- `backend/` — Express REST API
- `database/schema.sql` — MySQL database and users table
- `deploy/nginx.conf` — production reverse proxy
- `ecosystem.config.cjs` — PM2 process definition

## Run locally

1. Create a MySQL database and table:

   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. Put your MySQL values in `backend/src/config.js`. The variables are intentionally kept in code for this learning exercise. Change the JWT secret too.

3. Install and start:

   ```bash
   npm install
   npm run install:all
   npm run dev
   ```

4. Open `http://localhost:5173`. The frontend proxies `/api` to Express on port `5000`.

The backend runs `CREATE TABLE IF NOT EXISTS` at startup as well, so the table is created automatically once the `devops_portal` database exists.

## Deploy to an Ubuntu EC2 instance

### 1. AWS setup

- Launch Ubuntu 24.04 LTS.
- Security group inbound rules: SSH `22` from **your IP**, HTTP `80` from anywhere, and HTTPS `443` from anywhere. Do not expose MySQL `3306` publicly.
- If using RDS, allow port `3306` on the RDS security group only from the EC2 security group.

### 2. Install software

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
sudo apt update
sudo apt install -y nginx git mysql-client
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 3. Copy and configure the project

Push this folder to GitHub, then on EC2:

```bash
sudo mkdir -p /var/www/launchpad
sudo chown -R ubuntu:ubuntu /var/www/launchpad
git clone YOUR_GITHUB_REPOSITORY_URL /var/www/launchpad
cd /var/www/launchpad
npm run install:all
```

Edit `backend/src/config.js` and add your RDS/MySQL host, username, password, and a strong JWT secret. Then create the schema:

```bash
mysql -h YOUR_RDS_ENDPOINT -u YOUR_DATABASE_USER -p < database/schema.sql
```

### 4. Build and run

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the final command printed by `pm2 startup` so the API starts after a reboot.

### 5. Configure Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/launchpad
sudo ln -s /etc/nginx/sites-available/launchpad /etc/nginx/sites-enabled/launchpad
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Replace `YOUR_EC2_PUBLIC_IP_OR_DOMAIN` in the copied Nginx config first. Visit `http://YOUR_EC2_PUBLIC_IP`.

### Useful checks

```bash
pm2 status
pm2 logs launchpad-api
curl http://localhost:5000/api/health
sudo systemctl status nginx
```

For a real production deployment, move database credentials and the JWT secret to environment variables or AWS Secrets Manager, add HTTPS with Certbot, rate-limit authentication routes, and restrict CORS to your domain.
