import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  currentRoute: string;
  params: Record<string, string>;
  queryParams: Record<string, string>;
  navigate: (path: string, query?: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentRoute: '/',
  params: {},
  queryParams: {},
  navigate: () => {},
});

export const useRouter = () => useContext(RouterContext);
export const useNavigate = () => {
  const { navigate, currentRoute, params, queryParams } = useContext(RouterContext);
  return { navigate, currentRoute, params, queryParams };
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setSearch(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string, query?: Record<string, string>) => {
    let url = path;
    if (query && Object.keys(query).length > 0) {
      const qs = new URLSearchParams(query).toString();
      url = `${path}?${qs}`;
    }

    window.history.pushState({}, '', url);
    setCurrentPath(path);
    setSearch(window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Parse path and params
  let route = currentPath;
  const params: Record<string, string> = {};

  if (currentPath.startsWith('/pouches/') && currentPath !== '/pouches/new') {
    route = '/pouches/:id';
    params.id = currentPath.replace('/pouches/', '');
  }

  // Parse query parameters
  const queryParams: Record<string, string> = {};
  if (search) {
    const sp = new URLSearchParams(search);
    sp.forEach((val, key) => {
      queryParams[key] = val;
    });
  }

  return (
    <RouterContext.Provider
      value={{
        currentRoute: route,
        params,
        queryParams,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};
