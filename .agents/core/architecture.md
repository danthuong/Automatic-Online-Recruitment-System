# Architecture

Backend follows layered architecture:

- Routes → Controllers → Services → Models → Database

Rules:
- Controllers handle request/response only
- Services contain business logic
- Models interact with MongoDB
- AI calls must be inside services

No direct DB access from controllers
