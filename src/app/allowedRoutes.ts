// allowedRoutes.ts

// Define routes that are always accessible after authentication
export const ALWAYS_ALLOWED_ROUTES = [
    '/unauthorized',
    '/',
    '/staffqr',
  ] as const;
  
  // Helper function to check if a route is in the always allowed list
  export const isAlwaysAllowedRoute = (path: string): boolean => {
    return ALWAYS_ALLOWED_ROUTES.includes(path as typeof ALWAYS_ALLOWED_ROUTES[number]);
  };
  
  // Helper function to check if a path is allowed based on user permissions
  export const isPathAllowed = (
    currentPath: string,
    allowedScreens: string[],
    isAuthenticated: boolean
  ): boolean => {
    // If user is authenticated and path is in always allowed routes, permit access
    if (isAuthenticated && isAlwaysAllowedRoute(currentPath)) {
      return true;
    }
  
    // Check if path exists in allowed screens (case insensitive)
    return allowedScreens.some(
      screen => screen.toLowerCase() === currentPath.toLowerCase()
    );
  };