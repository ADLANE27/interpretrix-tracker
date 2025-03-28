
import React from 'react';
import { Routes, Route } from 'react-router-dom';

const Interpreter = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Interpreter Dashboard</h1>
      <Routes>
        <Route path="/" element={<div>Interpreter Home</div>} />
      </Routes>
    </div>
  );
};

export default Interpreter;
