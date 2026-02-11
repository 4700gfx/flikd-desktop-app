# Flik'd

A social media platform where users can share reviews on movies and shows, create collaborative watchlists, and track their progress through engaging AI-powered quizzes.

🌐 **[Live Demo](https://flikd-desktop-app.vercel.app/)**

## ✨ Features

- **Review & Share**: Post reviews of movies and shows to your feed and discover what others are watching
- **Smart Watchlists**: Create and manage watchlists to organize your viewing plans
- **Gamified Progress Tracking**: Earn points by completing items on your watchlist through AI-generated quizzes about movies and episodes
- **Collaborative Lists**: Share your watchlists with friends and track collective progress
- **Social Feed**: Engage with a community of movie and show enthusiasts

## 🛠️ Tech Stack

- **Frontend**: React with Tailwind CSS
- **Styling**: Vite for modern, fast development
- **Backend**: Supabase (Database, Authentication, Real-time)
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (latest LTS version recommended)
- npm (comes with Node.js)
- A Supabase account and project

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd flikd
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory and add the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TMDB_API_KEY=your_tmdb_api_key
# Add any other required API keys
```

4. Start the development server:
```bash
npm run dev
```

The application should now be running on `http://localhost:5173` (or your configured port).

## 📖 Usage Examples

### Creating a Review
1. Navigate to the "New Review" section
2. Search for a movie or show
3. Write your review and rate it
4. Share to your feed

### Building a Watchlist
1. Go to "My Watchlists"
2. Create a new list with a custom name
3. Add movies/shows from search or your reviewed content
4. Share the list with friends using a unique link

### Earning Points
1. Check off items from your watchlist
2. Complete the AI-generated quiz about the movie/episode
3. Earn points based on your quiz performance
4. Track your progress on the leaderboard

## 🏗️ Architecture Overview

### Project Structure

```
flikd/
├── src/
│   ├── components/       # Reusable React components
│   ├── pages/           # Page-level components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and Supabase service functions
│   ├── utils/           # Helper functions and utilities
│   ├── contexts/        # React Context providers
│   ├── assets/          # Static assets (images, icons)
│   └── styles/          # Global styles and Tailwind config
├── public/              # Public static files
└── ...config files
```

### Key Architectural Decisions

- **Component Organization**: Components are organized by feature and reusability, with shared components in a common directory
- **State Management**: React Context API for global state (user authentication, theme) and local state for component-specific data
- **Data Layer**: Supabase handles database operations, real-time subscriptions, and authentication
- **API Integration**: External movie data fetched from TMDB API, processed and cached where appropriate
- **Routing**: React Router for client-side navigation
- **Styling**: Utility-first approach with Tailwind CSS for consistent, responsive design

### Data Flow

1. User interactions trigger React component events
2. Components call service functions to interact with Supabase
3. Real-time subscriptions update UI when data changes
4. AI quiz generation happens server-side through Supabase Edge Functions

## 🤝 Contributing

We welcome contributions to Flik'd! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```
3. Make your changes following our code style
4. Commit your changes with clear, descriptive messages:
```bash
git commit -m "Add: Brief description of your changes"
```
5. Push to your fork:
```bash
git push origin feature/your-feature-name
```
6. Open a Pull Request against the `main` branch

### Code Style Guidelines

- Follow React best practices and hooks guidelines
- Use functional components with hooks
- Write clear, self-documenting code with comments for complex logic
- Use Tailwind utility classes for styling
- Ensure responsive design across devices
- Keep components small and focused on a single responsibility

### Commit Message Convention

- `Add:` for new features
- `Fix:` for bug fixes
- `Update:` for changes to existing features
- `Refactor:` for code refactoring
- `Docs:` for documentation changes
- `Style:` for formatting changes

### Testing Your Changes

Before submitting a PR:
1. Test your changes locally
2. Ensure the application builds without errors: `npm run build`
3. Check for console errors or warnings
4. Test across different screen sizes

### Reporting Issues

Found a bug or have a feature request? Please open an issue with:
- A clear, descriptive title
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots if applicable
- Your environment details (browser, OS)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Movie data provided by [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Built with [Supabase](https://supabase.com/)
- Deployed on [Vercel](https://vercel.com/)

## 📧 Contact

For questions or support, please open an issue or reach out through the application's contact form.

---

**Happy watching! 🎬🍿**