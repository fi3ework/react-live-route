import React from "react";
import PropTypes from "prop-types";
import warning from "warning";
import invariant from "invariant";
import matchPath from "./matchPath";

/**
 * The public API for rendering the first <Route> that matches.
 */
class Switch extends React.Component {
  static contextTypes = {
    router: PropTypes.shape({
      route: PropTypes.object.isRequired
    }).isRequired
  };

  static propTypes = {
    children: PropTypes.node,
    location: PropTypes.object
  };

  componentWillMount() {
    invariant(
      this.context.router,
      "You should not use <Switch> outside a <Router>"
    );
  }

  componentWillReceiveProps(nextProps) {
    warning(
      !(nextProps.location && !this.props.location),
      '<Switch> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.'
    );

    warning(
      !(!nextProps.location && this.props.location),
      '<Switch> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.'
    );
  }

  render() {
    const { route } = this.context.router;
    const { children } = this.props;
    const location = this.props.location || route.location; // 可以手动指定 location

    let match, child;
    React.Children.forEach(children, element => {
      if (match == null && React.isValidElement(element)) {
        const {
          path: pathProp, // path 
          exact, // 路径完全匹配
          strict, // 是否结尾匹配带/的路径
          sensitive, // 大小写敏感
          from // path 的备胎
        } = element.props;
        const path = pathProp || from;

        child = element;
        match = matchPath(
          location.pathname,
          { path, exact, strict, sensitive },
          route.match
        );
      }
    });

    return match
      ? React.cloneElement(child, { location, computedMatch: match }) // 重新计算两个参数
      : null;
  }
}

export default Switch;
