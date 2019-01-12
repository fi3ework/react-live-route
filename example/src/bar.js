import React from "react";
import { Link } from "react-router-dom";
import "./styles.css";

const Bar = props => {
  return (
    <div className="bar">
      <Link to="/">Home</Link>
      <Link to="/items">Items</Link>
      <Link to="/about">About</Link>
    </div>
  );
};

export default Bar;
