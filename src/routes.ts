
import React from 'react';
import { RouteObject } from 'react-router-dom';

// Create placeholder components for now
const Home = () => <div>Home Page</div>;
const About = () => <div>About Page</div>;
const Admin = () => <div>Admin Page</div>;
const Interpreter = () => <div>Interpreter Page</div>;

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
