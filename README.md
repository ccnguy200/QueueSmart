# QueueSmart
## Software Design Project - Team 28

## Technology Used: HTML/CSS/JavaScript

* **Team Members:**
  * Caroline Jensen
  * Olamide Iluku
  * Jinjian Chen
  * Christina Nguyen

## How to Run (A3 Back End)

1. Install [Node.js](https://nodejs.org/)
2. In the project folder, install the packages (only needed the first time):
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open **http://localhost:3000/** in the browser. The pages and the API both come from this server, so don't open the HTML files by double-clicking them (the API calls won't work that way).

To run the unit tests with the coverage report:
```
npm test
```

## API Endpoints

The backend exposes these endpoints (all data is kept in memory while the server runs):

### Authentication
- `POST /api/auth/login` — log in and get the user's role
- `POST /api/auth/register` — register a new user (or admin) with validation

### Queue Management (User)
- `GET /api/queue` — check the API is up and see the current queue
- `POST /api/queue/join` — join a queue for a service
- `POST /api/queue/leave` — leave a queue by queue id
- `GET /api/queue/status` — get every active queue entry

### Queue Management (Admin)
- `GET /api/admin/queue` — view the current queue
- `POST /api/admin/queue/serve` — serve the next user (priority + arrival order)
- `POST /api/admin/queue/reorder` — move a user up or down (`queueId`, `direction`)
- `POST /api/admin/queue/no-show` — remove the next user and record a no-show

### Service Management
- `GET /api/services` — list every service
- `GET /api/services/:id` — get one service
- `POST /api/services` — create a service (name, description, duration, priority)
- `PUT /api/services/:id` — update a service
- `DELETE /api/services/:id` — delete a service
- `POST /api/services/:id/open` — open a service queue
- `POST /api/services/:id/close` — close a service queue (stops new joins)

### Notifications
- `GET /api/notifications?userName=...` — get a user's notifications

### History
- `GET /api/history` — list queue history (optional `userName` and `outcome` filters)

### Health
- `GET /api/health` — check the server is running

