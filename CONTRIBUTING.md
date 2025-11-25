# Contributing to RASI

First off, thank you for considering contributing to RASI! It's people like you that make this project great.

## Code of Conduct

This project and everyone participating in it is governed by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/your-repo/rasi/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/your-repo/rasi/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- Open a new issue to discuss your enhancement.
- Clearly describe the proposed enhancement and its benefits.

### Pull Requests

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  Ensure the test suite passes (`npm test`).
4.  Make sure your code lints (`npm run lint`).
5.  Issue that pull request!

## Architecture Guidelines

To maintain a consistent and scalable codebase, please adhere to the following architectural principles.

### Feature-Based Structure

-   **Group by Feature**: All code related to a specific feature (e.g., `auth`, `artisti`) should reside within its own directory in `src/features/`.
-   **Directory Structure**: A feature directory should be organized as follows:
    -   `components/`: Feature-specific React components.
    -   `services/`: Business logic, API calls, and data transformations.
    -   `types/`: TypeScript types and interfaces.
    -   `hooks/`: Feature-specific React hooks.

### Creating a New Feature

To create a new feature, follow these steps:

1.  **Create a new feature directory**: Inside `src/features/`, create a new directory with the name of your feature (e.g., `src/features/playlists/`).
2.  **Set up the directory structure**: Inside your new feature directory, create the following subdirectories:
    -   `components/`: For your feature-specific React components.
    -   `services/`: For business logic, API calls, and data transformations.
    -   `types/`: For TypeScript types and interfaces.
3.  **Create service files**: In the `services/` directory, create a `[feature].service.ts` file (e.g., `playlists.service.ts`) to handle the business logic. Add a corresponding test file `[feature].service.test.ts`.
4.  **Create component files**: In the `components/` directory, create your React components. For each component, create a corresponding test file `[component].test.tsx`.
5.  **Add routes**: If your feature includes new pages, add them to the `src/app/` directory, following the Next.js App Router conventions.

By following this structure, you ensure that your feature is well-organized, testable, and consistent with the rest of the codebase.

### Shared Code

-   **`src/shared/`**: Code that is reused across multiple features belongs in the `shared` directory.
    -   `components/`: Generic, reusable UI components (e.g., `Button`, `Input`).
    -   `lib/`: Shared libraries and utilities (e.g., Supabase client).
    -   `contexts/`: Global React contexts.
    -   `hooks/`: Global React hooks.

### State Management

-   **Local State**: Use `useState` and `useReducer` for component-level state.
-   **Global State**: Use React Context for global state that is shared across the application (e.g., user authentication).

### Styling

-   **Tailwind CSS**: Use Tailwind CSS for styling.
-   **Shadcn UI**: Use Shadcn UI for UI components.

Thank you for your contribution!
