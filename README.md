# Budgeter

## Docker Setup

### Environment Variables

The project uses environment variables stored in a `.env` file. A default configuration is provided, but you can customize it according to your needs:


### Running the Application

1. Make sure Docker and Docker Compose are installed on your system
2. Clone the repository
3. Navigate to the project root directory
4. Start the application:

```bash
docker-compose up --build
```

### Accessing Services

- Frontend: http://localhost:3100
- Backend API: http://localhost:8100/api
- Database: localhost:5432 (credentials as per .env file)

### Development

The Docker setup includes volume mounts for both backend and frontend, allowing for hot reloading during development. Any changes you make to the code will be reflected in the running containers.
