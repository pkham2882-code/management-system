# Client Management System

A small CRUD web application built with HTML, CSS, JavaScript, Node.js, Express, and SQLite.

## Requirements

- Node.js 18 or later (LTS recommended)
- Visual Studio Code

## Run the project

1. Extract the ZIP file.
2. Open the `client-management-system` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Open this address in your browser:

   http://localhost:3000

The server creates `clients.db` automatically in the project folder. Client records persist in that database file after restarting the app.

## Features

- Add, view, search, edit, and delete clients
- Client ID, name, phone, email, company, type, address, notes
- Summary counts for all clients, companies, and VIP clients
- Required-field and email validation
- Duplicate Client ID protection
- Responsive layout for desktop and mobile

## Database backup

Stop the server and copy `clients.db` to a safe location to back up your records. Do not delete this file if you want to keep your saved clients.

## Troubleshooting

- If `npm` is not recognized, install Node.js LTS and restart VS Code.
- If port 3000 is already in use, run `PORT=3001 npm start` on macOS/Linux or `$env:PORT=3001; npm start` in PowerShell, then open http://localhost:3001.
- Keep the terminal running while using the app.
