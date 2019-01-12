import React from "react";
import { Link } from "react-router-dom";

const List = props => {
  return (
    <div>
      <Link to="/items">
        <div>&gt;&gt; back to List</div>
      </Link>
      <div className="detailContent">{`hello, I'm item - ${
        props.match.params.id
      }`}</div>
      <Link
        className="pagination"
        to={`/item/${Number.parseInt(props.match.params.id) - 1}`}
      >
        Prev item
      </Link>
      <Link
        className="pagination"
        to={`/item/${Number.parseInt(props.match.params.id) + 1}`}
      >
        Next item
      </Link>
    </div>
  );
};

export default List;
