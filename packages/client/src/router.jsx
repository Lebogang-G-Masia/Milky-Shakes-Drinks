import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RouterContext = createContext({
  path: '/',
  search: '',
  params: {},
  navigate: () => {},
});

export function useRouter() {
  return useContext(RouterContext);
}

function parseQuery(searchStr) {
  const params = new URLSearchParams(searchStr);
  const result = {};
  for (const [key, val] of params.entries()) {
    result[key] = val;
  }
  return result;
}

function normalizePath(rawPath) {
  if (!rawPath) return '/';
  const clean = rawPath.split('?')[0].split('#')[0];
  const trimmed = clean.replace(/\/+$/, '') || '/';
  return trimmed;
}

export function RouterProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
      setCurrentSearch(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to, options = {}) => {
    const [pathPart, searchPart] = to.split('?');
    const targetPath = normalizePath(pathPart);
    const searchString = searchPart !== undefined ? `?${searchPart}` : '';
    const fullUrl = `${targetPath}${searchString}`;

    if (options.replace) {
      window.history.replaceState(null, '', fullUrl);
    } else {
      window.history.pushState(null, '', fullUrl);
    }

    setCurrentPath(targetPath);
    setCurrentSearch(searchString);

    if (!options.keepScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);

  const params = parseQuery(currentSearch);

  return (
    <RouterContext.Provider value={{ path: currentPath, search: currentSearch, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function Link({ to, children, className = '', activeClassName = '', onClick, ...props }) {
  const { path, navigate } = useRouter();
  const isActive = path === normalizePath(to.split('?')[0]);
  const combinedClassName = `${className} ${isActive && activeClassName ? activeClassName : ''}`.trim();

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <a href={to} className={combinedClassName} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
