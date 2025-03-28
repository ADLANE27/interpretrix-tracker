
import React from 'react';
import { RouteObject } from 'react-router-dom';

// Import your pages here
import Home from './pages/Home';
import About from './pages/About';
import Admin from './pages/Admin';
import Interpreter from './pages/Interpreter';

export const routes: RouteObject[] = [
  {
    path: "/",
    element: React.createElement(Home),
  },
  {
    path: "/about",
    element: React.createElement(About),
  },
  {
    path: "/admin/*",
    element: React.createElement(Admin),
  },
  {
    path: "/interpreter/*",
    element: React.createElement(Interpreter),
  },
];
