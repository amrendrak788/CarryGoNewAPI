# SafarDrop Backend API

Localhost backend API for the SafarDrop Android POC.

## Tech

- Node.js
- No external npm packages
- MVC architecture
- JSON file database adapter

## Run

```bash
cd backend
npm start
```

Server URL:

```text
http://localhost:8080
```

Health check:

```bash
curl http://localhost:8080/api/health
```

## Deploy on Koyeb

1. Push this backend folder as a separate GitHub repository.
2. Open Koyeb and create a new Web Service.
3. Choose GitHub as the deployment source.
4. Select the backend API repository.
5. Use Dockerfile deployment if Koyeb asks for a builder.
6. Select the free instance.
7. Set the public port to `8080`.
8. Deploy.

After deployment, Koyeb gives a public HTTPS URL like:

```text
https://carrygo-api-username.koyeb.app
```

Health check:

```bash
curl https://carrygo-api-username.koyeb.app/api/health
```

Update Android API config:

```java
public static final String BASE_URL = "https://carrygo-api-username.koyeb.app";
```

Do not add `:8080` to the public Koyeb URL.

## Folder Structure

```text
backend
├── data/database.json
├── src
│   ├── config
│   ├── controllers
│   ├── database
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── services
│   ├── utils
│   └── server.js
```

## Main APIs

### Auth

```http
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/select-mode
```

### Customers

```http
GET  /api/customers/dashboard
POST /api/customers/parcels
GET  /api/customers/deliveries
POST /api/customers/travellers/:id/book
```

### Travellers

```http
GET  /api/travellers/dashboard
POST /api/travellers/trips
GET  /api/travellers/parcels
POST /api/travellers/parcels/:id/accept
POST /api/travellers/deliveries/:id/advance
```

## Notes

- This is a local POC backend.
- Authentication is dummy and token-based.
- Database is a JSON file so it is easy to inspect and reset.
- On free cloud hosting, JSON file changes can reset after redeploy/restart. Use Supabase, PostgreSQL, Firebase, MongoDB Atlas, or another managed database for permanent data.
- Later you can replace `JsonDatabase` with SQLite, MySQL, PostgreSQL, Firebase, or MongoDB without changing controller routes.
