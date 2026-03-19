# Budget Management - USA Edition (Frontend)

This project is a high-performance **Angular 21** application using **Signals**, **Modern Control Flow**, and a **Standalone Component Architecture**.

## 🚀 Development Server

To start a local development server with proxy support for the backend:

```bash
ng serve
```

Once the server is running, navigate to `http://localhost:4200/`.

## 🛠️ Commands & Quality Control

We maintain high code standards with automated linting and formatting.

| Command | Description |
| :--- | :--- |
| `npm run lint` | Runs **ESLint** for TypeScript and HTML logic checks. |
| `npm run lint:scss` | Runs **Stylelint** to verify SCSS standard compliance. |
| `npm run format` | Uses **Prettier** to auto-format every file in the project. |
| `ng build` | Compiles the project into the `dist/` directory. |
| `ng test` | Executes unit tests with **Vitest**. |

## 🏗️ Architecture Highlights

### **1. Component Library**
The UI is built with highly modular, standalone components found in `src/app/components/`:
*   **Icon**: Centralized SVG handling.
*   **Store/Region Selector**: Encapsulated list-filtering logic.
*   **Product/Saved Card**: Reusable visual bricks for data representation.

### **2. State Management**
*   **UiStore**: Global signal store for toasts, network status, and user session.
*   **Signals & Computed**: Used extensively for granular reactivity without unnecessary change detection cycles.

### **3. SCSS & Typography**
*   Migration from CSS to **SCSS** complete.
   *   Component-level scoped styles.
   *   Prettier integrated for formatting CSS properties.

### **4. Strict Typing**
All models are defined in [src/app/models/types.ts](src/app/models/types.ts). We maintain **zero** `any` types for maximum reliability.

