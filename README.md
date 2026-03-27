# Pennywise

Pennywise is a personal finance management system built for academic coursework. It helps users manage income, expenses, budgets, alerts, analytics, and profile settings in one place.

## Features
- User signup, login, OTP verification, and password reset
- Income and expense records with category management
- Monthly and category-wise budget planning
- Alert thresholds for overall and category budgets
- Analytics dashboards and spending summaries
- Profile management with username, password, and photo updates

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

## Local Setup
1. Install dependencies in both `frontend/` and `backend/`.
2. Create a local `backend/.env` file with your own environment values.
3. Start the backend with `cd backend && node server.js`.
4. Start the frontend with `cd frontend && npm start`.

You can also run `start-dev.cmd` from the project root.

## Notes
- `backend/.env` should stay local and must not be committed.
- Real database and email credentials should be provided through environment variables only.

## License
This project is licensed under the MIT License.
