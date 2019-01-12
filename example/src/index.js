import React from "react";
import ReactDOM from "react-dom";
import { Route, BrowserRouter } from "react-router-dom";
import LiveRoute from "react-live-route";
import List from "./list";
import Detail from "./detail";
import Bar from "./bar";
import About from "./about";
import Home from "./home";
import "./styles.css";

function App() {
  return (
    <div className="App">
      <Route exact path="/" component={Home} />
      <LiveRoute
        path="/items"
        component={List}
        livePath="/item/:id"
        name="items"
      />
      <Route path="/item/:id" component={Detail} />
      <LiveRoute
        path="/about"
        alwaysLive={true}
        component={About}
        name="about"
      />
      <Bar />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  rootElement
);

if ("scrollRestoration" in window.history) {
  // 默认值为'auto'
  // window.history.scrollRestoration = 'manual'
}

document.addEventListener("scrollTo", () => {
  console.log("233");
});
