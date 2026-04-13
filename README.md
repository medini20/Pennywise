# Pennywise

Pennywise is a personal finance management system built for academic coursework. It helps users manage income, expenses, budgets, alerts, analytics, and profile settings in one place.

## Features
- User signup, login, OTP verification, and password reset
- Income and expense records with category management
- Monthly and category-wise budget planning
- Alert thresholds for overall and category budgets
- Analytics dashboards and spending summaries
- Profile management with name, password, and photo updates

## Local Setup

### Prerequisites
- Node.js and npm
- MySQL Server running locally
- Optional: a Gmail app password for real email delivery
- Optional: a Google OAuth client ID for Google sign-in

### 1. Install dependencies
Run these commands from the `Pennywise` folder:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure the backend
Create or update `backend/.env` with values like these:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=expense_tracker
PORT=5001
JWT_SECRET=replace_with_a_secure_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
GOOGLE_CLIENT_ID=your_google_client_id_here
```

Notes:
- `EMAIL_USER` and `EMAIL_PASS` are required for signup and password reset OTP delivery.
- If real email credentials are missing, the backend now rejects OTP requests instead of exposing the OTP in the UI.
- `GOOGLE_CLIENT_ID` is only required if you want Google sign-in to work.

### 3. Create and import the database
The backend defaults to `expense_tracker`, but the SQL dump in `database/expense_tracker.sql` currently creates a database named `railway`.

Before importing, choose one of these options:
- Recommended: change the first two lines of `database/expense_tracker.sql` from `railway` to `expense_tracker`.
- Or keep the SQL file as-is and set `DB_NAME=railway` in `backend/.env`.

Then import the SQL file into MySQL. You can do that from MySQL Workbench or with the MySQL CLI:

```sql
SOURCE database/expense_tracker.sql;
```

Important: the backend only applies small runtime schema updates on startup. The initial schema from `database/expense_tracker.sql` still needs to be imported first.

### 4. Configure the frontend (optional)
Most frontend pages already default to `http://localhost:5001`, but you can add a `frontend/.env` file if needed:

```env
REACT_APP_API_BASE_URL=http://localhost:5001
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

`REACT_APP_GOOGLE_CLIENT_ID` is optional and only needed if you want the Google sign-in button to appear.

### 5. Start the app
Start the backend in one terminal:

```bash
cd backend
npm start
```

Start the frontend in a second terminal:

```bash
cd frontend
npm start
```

On Windows, you can also use:

```bat
start-dev.cmd
```

### 6. Open the app
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`

## Project Structure
- `frontend/` React application for the user interface
- `backend/` Express and MySQL API
- `database/` database-related assets
- `Documents and Details/` project documents

## Tech Stack
- Frontend: React, CSS, React Router
- Backend: Node.js, Express
- Database: MySQL
- Libraries: `mysql2`, `jsonwebtoken`, `bcrypt`, `nodemailer`, `recharts`

## Notes
- `backend/.env` should stay local and must not be committed.
- Real database and email credentials should be provided through environment variables only.

## License
This project is licensed under the MIT License.
