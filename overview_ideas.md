# LucillaCRM: Overview of Improvements & Fixes

## 1. Architecture & Routing
- **Problem**: `App.tsx` currently acts as a monolithic controller, handling all view logic with a simple state variable (`view`).
- **Solution**: Implement **React Router** (`react-router-dom`). This will enable:
  - Deep linking (e.g., `/invoices/123`).
  - Better browser history navigation (back/forward buttons).
  - Lazy loading of routes for better performance.

## 2. Refactoring `App.tsx`
- **Problem**: The main file contains 500+ lines mixing implementation details, PDF generation, email logic, and UI rendering.
- **Solution**:
  - Extract PDF generation logic to a hook `usePdfGenerator`.
  - Move Email logic to a `useEmailSender` hook or service.
  - Break down the render method into smaller layout components.

## 3. TypeScript & Type Safety
- **Problem**: Usage of `// @ts-ignore` (lines 178, 182, 255) for `html2pdf`.
- **Solution**:
  - Add proper type definitions for `html2pdf.js` (create a `types/html2pdf.d.ts` file).
  - Ensure strict typing for all `any` usages in the codebase.

## 4. Hardcoded Data
- **Problem**: `DEFAULT_SUPPLIER_DATA` contains hardcoded sensitive info (IBANs, Phones) inside the source code.
- **Solution**:
  - Move default configurations to a separate configuration file or environment variables (`.env`).
  - Ideally, fetch this from the User's profile in Firestore on load.

## 5. UI/UX Polishing
- **Problem**: Layouts are functional but could be more premium.
- **Solution**:
  - **Theming**: Consolidate colors into a Tailwind config or CSS variables to ensure consistent "Dark Mode" and "Brand Color" application.
  - **Feedback**: Add toast notifications (e.g., `sonner` or `react-hot-toast`) instead of `alert()` for actions like "Email Sent" or "PDF Downloaded".
  - **Loading States**: Add skeleton loaders rather than a simple pulse text for better perceived performance.

## 6. Code Maintenance
- **Problem**: Multiple large `useEffect` hooks monitoring user state and DOM properties.
- **Solution**:
  - Encapsulate auth side-effects in the `useAuthStore` or a dedicated `AuthProvider`.
  - Use custom hooks for theme management.

## 7. Dependencies
- **Problem**: `firestore-data.old.json` suggests legacy data handling.
- **Solution**: Verify if this is needed or if a migration script is required to clean up the repo.
