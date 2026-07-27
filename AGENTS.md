<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Single Next.js 16 app (`trimr`), App Router, source in `app/`. Package manager is npm (`package-lock.json`); Node 22 works.
- Scripts live in `package.json`: `npm run dev` (Turbopack dev server on http://localhost:3000), `npm run lint` (ESLint), `npm run build` (production build), `npm run start`.
- The update script already runs `npm ci`, so dependencies are installed on startup. Just start the dev server to work on the UI.
- `next.config.ts` enables the React Compiler (`reactCompiler: true`) via `babel-plugin-react-compiler`.
