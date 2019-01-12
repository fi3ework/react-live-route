import React from "react";
import { Link } from "react-router-dom";

const Home = props => {
  return (
    <div>
      <a
        className="detailContent"
        href="https://github.com/fi3ework/react-live-route"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h1>react-live-route</h1>
      </a>
      <Link to="/items">
        <div className="entry">into items</div>
      </Link>
    </div>
  );
};

export default Home;
