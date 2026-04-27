# finalprojapp

Simple full-stack auction demo for a solo class project.

## What changed

- Cognito is fully bypassed for the demo. Sign in and sign up now use local mock auth.
- The frontend API base URL is set to `http://3.138.107.95:8000/api`.
- Django CORS is configured for the Expo web app on port `8081`.
- Events and items load from Django instead of frontend mock data.
- Event and item creation now use the Django API and persist in SQLite.
- If the database is empty, the backend auto-seeds sample events and items.
- Stripe is not required for the demo flow.

## Backend

```bash
cd /home/ubuntu/finalprojapp/djangobackend
source ~/venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Frontend

Create `expo-auction-frontend/.env` with:

```bash
EXPO_PUBLIC_DJANGO_API_URL=http://3.138.107.95:8000/api
```

Then run:

```bash
cd /home/ubuntu/finalprojapp/expo-auction-frontend
npm install
npx expo start --web --clear
```

## Open in Browser

- Frontend: `http://3.138.107.95:8081`
- Backend API: `http://3.138.107.95:8000/api`

## Demo flow

1. Open the frontend.
2. Sign in with any email and password.
3. View the seeded events list.
4. Click `Add` to create a new event.
5. Open an event to view its items.
6. Click `Add` to create a new item.
7. Refresh the page and confirm the new event and item still exist in SQLite.
