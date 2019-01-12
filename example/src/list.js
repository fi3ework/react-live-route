import React from "react";
import { Link } from "react-router-dom";

class ListPage extends React.Component {
  state = { count: 0 };

  componentWillUnmount() {
    console.log("##### items will unmount #####");
  }

  componentDidMount() {
    console.log("##### items did mount #####");
    window.scrollTo(0, 0);
    setInterval(() => {
      this.setState({
        count: this.state.count + 1
      });
    }, 200);
  }

  render() {
    const list = Array(200)
      .fill("")
      .map((item, index) => {
        return (
          <Link className="item" to={`/item/${index}`} key={index}>
            <div>Item - {index}</div>
          </Link>
        );
      });

    const timer = <h2 className="count">count: {this.state.count}</h2>;
    const desc = (
      <div className="desc">
        <p>
          This page of route is using <code>LiveRoute</code> with{" "}
          <code>livePath</code>.
        </p>
        <p>
          In this page, the list page will not be unmounted on item detail page
          and will be unmounted when enter into other pages such as home page.
        </p>
        <p>
          The count number above is a sign of component live state. It will be
          reset to 0 when the component of Route unmounted. You can scroll the
          page and it will be restored when backing from item detail page.
        </p>
        <p>Feel free to try it.</p>
      </div>
    );
    return (
      <div className="list">
        {timer}
        {desc}
        {list}
      </div>
    );
  }
}

export default ListPage;
