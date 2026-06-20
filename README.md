<<<<<<< HEAD
Machine POS

A modern Point of Sale (POS) system for managing sales, products, inventory, and transactions.

Features

* Product management
* Sales and checkout
* Inventory tracking
* Receipt generation
* Sales reports
* User authentication

Tech Stack

* React
* TypeScript
* Vite
* Node.js
* PostgreSQL (if applicable)
=======
# machinePOS

A point-of-sale system with a React frontend and Express backend. This repository includes a KHQR payment page built with Material UI and a backend API structure for payment verification.

## Project Structure

- `client/` - React frontend application
  - `src/components/payment/KHQRPaymentPage.tsx` - KHQR payment UI component
  - `src/hooks/useKHQRPayment.ts` - Payment state management hook
  - `src/lib/khqr-utils.ts` - KHQR utility functions
  - `src/routes/_app.payments.$invoiceId.tsx` - Route for payment page
- `sever/` - Express/SQLite backend service
  - `package.json` - backend dependency and script definitions

> Note: the backend folder is named `sever` in this repository.

## Frontend Setup

### Install

```bash
cd "client"
npm install
```

### Run Dev Server

```bash
cd "client"
npm run dev
```

The application starts on a Vite port, usually `http://localhost:8082/` if the default ports are occupied.

### Build

```bash
cd "client"
npm run build
```

### Lint / Format

```bash
cd "client"
npm run lint
npm run format
```

## Backend Setup

### Install

```bash
cd "sever"
npm install
```

### Run Backend

```bash
cd "sever"
npm run dev
```

### Build Backend

```bash
cd "sever"
npm run build
```

### Database Utilities

```bash
cd "sever"
npm run db:seed
npm run db:inspect
```

## KHQR Payment Page

### Route

The payment page is registered under:

```text
/payments/:invoiceId
```

Example:

```text
http://localhost:8082/payments/INV-001
```

### Key Files

- `client/src/components/payment/KHQRPaymentPage.tsx`
- `client/src/hooks/useKHQRPayment.ts`
- `client/src/lib/khqr-utils.ts`
- `client/src/routes/_app.payments.$invoiceId.tsx`

### Features

- Invoice number display
- Total amount display
- KHQR QR code image area
- 15-minute countdown timer
- Payment status states: `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`
- Verify payment button
- Cancel button with confirmation flow
- Material UI-based layout
- Responsive design

## API Endpoints Required for KHQR

The frontend expects these backend endpoints to be implemented:

- `GET /api/payments/details/:invoiceId`
- `POST /api/payments/generate-khqr`
- `POST /api/payments/verify`
- `GET /api/payments/status/:invoiceNumber`
- `POST /api/payments/cancel/:invoiceNumber`
- `PATCH /api/orders/:invoiceId/status`

If these endpoints are not yet implemented, the payment page will render but will not fully complete the payment flow.

## Notes

- The frontend uses React, Material UI, TanStack Router, and Vite.
- The backend uses Express, SQLite, Drizzle ORM, and JSON Web Tokens.
- If the dev server detects port conflicts, it automatically tries the next available port.

## Troubleshooting

- If `npm run dev` reports a port conflict, open the local URL shown in the terminal.
- If the payment page does not load, ensure the route file exists at `client/src/routes/_app.payments.$invoiceId.tsx`.
- For backend API problems, verify the `sever/` service is running and accessible.

## License

This project is provided as-is for development and integration.
>>>>>>> 4292a20 (feat: add backend controllers, routes, services and migrations)
