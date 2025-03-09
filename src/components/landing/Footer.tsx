
import React from 'react';

export const Footer = () => {
  return (
    <footer className="w-full py-4 px-4 mt-auto border-t border-gray-100">
      <div className="container mx-auto text-center">
        <p className="text-sm text-gray-600">
          © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
};
