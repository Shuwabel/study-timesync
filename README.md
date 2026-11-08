# StudySync

An AI-style study timetable generator. Enter your courses, exam dates and available hours, and StudySync builds a week-by-week plan of Focus, Review and Practice sessions you can reorder, edit, share and export to PDF.

Everything runs in the browser. Timetables are stored in local storage, so there is no backend, account or API key.

## Stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui, React Router, dnd-kit, date-fns, jsPDF, Vitest.

## Run it

```bash
npm install
npm run dev
```

## Scripts

- `npm run build`: production build into `dist`
- `npm run lint`: ESLint
- `npm test`: unit tests

## Deploy

Import the repository on Vercel. It detects Vite automatically and needs no environment variables.
