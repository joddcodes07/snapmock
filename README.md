# SnapMock

SnapMock is a lightweight, configuration-driven mock REST API server for frontend development and testing. Give it a JSON database and it exposes CRUD endpoints without an Express app, route files, or request handlers.

## Requirements and installation

Node.js 18 or newer is required. Once published, install it with `npm install snapmock`, or run it with `npx snapmock`.

For development in this repository:

```sh
npm install
node bin/snapmock.js --db examples/db.json --port 3000
```

## Quick start

Create `db.json`:

```json
{ "movies": [{ "id": 1, "title": "Interstellar", "genre": "Sci-Fi" }] }
```

Start the server:

```sh
npx snapmock --db ./db.json --port 3000
```

SnapMock creates `GET`, `POST` endpoints for every collection and `GET`, `PUT`, `PATCH`, `DELETE` endpoints for each record. It persists successful mutations to the same JSON file using an atomic write.

## API examples

```sh
curl http://127.0.0.1:3000/movies
curl http://127.0.0.1:3000/movies/1
curl -X POST http://127.0.0.1:3000/movies -H 'content-type: application/json' -d '{"title":"Dune","genre":"Sci-Fi"}'
curl -X PATCH http://127.0.0.1:3000/movies/1 -H 'content-type: application/json' -d '{"genre":"Drama"}'
curl -X DELETE http://127.0.0.1:3000/movies/1
```

Records without an `id` receive the next numeric ID. Duplicate IDs return `400`. Successful creation returns `201`; deletion returns `204`; missing records return `404`; unsupported methods return `405`.

### Filtering, search, and pagination

```sh
curl 'http://127.0.0.1:3000/movies?genre=Sci-Fi'
curl 'http://127.0.0.1:3000/movies?q=interstellar'
curl 'http://127.0.0.1:3000/movies?_page=1&_limit=5'
```

Pagination responses include `x-total-count`, `x-page`, `x-limit`, and `x-total-pages` headers. List responses remain JSON arrays.

## CLI reference

```text
snapmock --db <file> [--port 3000] [--delay milliseconds]
         [--error-rate 0-100] [--scenario normal|unauthorized|serverError|slowNetwork]
snapmock generate <collection> --count <number> --output <file>
```

`--delay` waits before each non-OPTIONS request. `--error-rate` simulates random `500` responses. `unauthorized` always returns `401`, `serverError` always returns `500`, and `slowNetwork` adds one second of latency. Generate supports user/customer-style records (name, email, phone, age), product records (name, price), and general records.

## Frontend usage

```js
const response = await fetch('http://127.0.0.1:3000/movies?genre=Sci-Fi');
const movies = await response.json();
```

## Architecture

- `bin/`: executable command-line entry point.
- `src/database.js`: validated JSON storage and serialized atomic writes.
- `src/server.js`, `src/router.js`, `src/middleware.js`: HTTP lifecycle, CRUD routing, bounded JSON bodies, and responses.
- `src/scenarios.js`: delay and failure simulation.
- `src/generators.js`: dependency-free fake data.

## Known limitations

SnapMock is intended for local development, not production: it has no authentication, schema system, relationship handling, file watching, or multi-process database locking. All collections must be arrays inside one JSON object.

## Contributing

Run `npm test` before submitting changes. The project uses Node's built-in test runner and has no runtime dependencies.

## License

[MIT](LICENSE)
