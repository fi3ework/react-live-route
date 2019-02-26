"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var warning = require("warning");
var invariant = require("invariant");
var React = require("react");
var PropTypes = require("prop-types");
var ReactDOM = require("react-dom");
var react_router_1 = require("react-router");
var react_is_1 = require("react-is");
var isEmptyChildren = function (children) { return React.Children.count(children) === 0; };
var LiveState;
(function (LiveState) {
    LiveState["NORMAL_RENDER_MATCHED"] = "normal matched render";
    LiveState["NORMAL_RENDER_UNMATCHED"] = "normal unmatched render (unmount)";
    LiveState["NORMAL_RENDER_ON_INIT"] = "normal render (matched or unmatched)";
    LiveState["HIDE_RENDER"] = "hide route when livePath matched";
})(LiveState || (LiveState = {}));
var debugLog = function (message) {
    // console.log(message)
};
/**
 * The public API for matching a single path and rendering.
 */
var LiveRoute = /** @class */ (function (_super) {
    __extends(LiveRoute, _super);
    function LiveRoute() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.routeDom = null;
        _this.state = {
            match: _this.computeMatch(_this.props, _this.context.router)
        };
        _this.liveState = LiveState.NORMAL_RENDER_ON_INIT;
        _this.scrollPosBackup = null;
        _this.previousDisplayStyle = null;
        return _this;
    }
    LiveRoute.prototype.getChildContext = function () {
        return {
            router: __assign({}, this.context.router, { route: {
                    location: this.props.location || this.context.router.route.location,
                    match: this.state.match
                } })
        };
    };
    LiveRoute.prototype.componentWillMount = function () {
        warning(!(this.props.component && this.props.render), 'You should not use <Route component> and <Route render> in the same route; <Route render> will be ignored');
        warning(!(this.props.component && this.props.children && !isEmptyChildren(this.props.children)), 'You should not use <Route component> and <Route children> in the same route; <Route children> will be ignored');
        warning(!(this.props.render && this.props.children && !isEmptyChildren(this.props.children)), 'You should not use <Route render> and <Route children> in the same route; <Route children> will be ignored');
    };
    LiveRoute.prototype.componentDidMount = function () {
        // backup router and get DOM when mounting
        if (this.doesRouteEnableLive() && this.state.match) {
            this._latestMatchedRouter = this.context.router;
            this.getRouteDom();
        }
    };
    LiveRoute.prototype.componentWillReceiveProps = function (nextProps, nextContext) {
        warning(!(nextProps.location && !this.props.location), '<Route> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.');
        warning(!(!nextProps.location && this.props.location), '<Route> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.');
        var match = this.computeMatch(nextProps, nextContext.router);
        var computedMatch = match;
        // recompute match if enable live
        if (this.doesRouteEnableLive()) {
            computedMatch = this.computeMatchWithLive(this.props, nextProps, nextContext, match);
        }
        this.setState({
            match: computedMatch
        });
    };
    // get route of DOM
    LiveRoute.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (!this.doesRouteEnableLive()) {
            return;
        }
        // restore display when matched normally
        debugLog(this.liveState);
        if (this.liveState === LiveState.NORMAL_RENDER_MATCHED) {
            this.showRoute();
            this.restoreScrollPosition();
            this.clearScroll();
        }
        // get DOM if match and render
        if (this.state.match) {
            this.getRouteDom();
        }
    };
    // clear on unmounting
    LiveRoute.prototype.componentWillUnmount = function () {
        this.clearScroll();
    };
    LiveRoute.prototype.doesRouteEnableLive = function () {
        return this.props.livePath || this.props.alwaysLive;
    };
    /**
     * @param {*} props: this.props
     * @param {*} nextProps: nextProps
     * @param {*} nextContext: nextContext
     * @param {*} match: computed `match` of current path
     * @returns
     * the returned object will be computed by following orders:
     * If path matched (no matter livePath matched or not), return normal computed `match`
     * If livePath matched, return latest normal render `match`
     * If livePath unmatched, return normal computed `match`
     * @memberof Route
     * Back up current router every time it is rendered normally, backing up to the next livePath rendering
     */
    LiveRoute.prototype.computeMatchWithLive = function (props, nextProps, nextContext, match) {
        debugLog(">>> " + this.props.name + " <<<");
        // compute if livePath match
        var livePath = nextProps.livePath, alwaysLive = nextProps.alwaysLive;
        var nextPropsWithLivePath = __assign({}, nextProps, { paths: livePath });
        var prevMatch = this.computeMatch(props, this.context.router);
        var livePathMatch = this.computePathsMatch(nextPropsWithLivePath, nextContext.router);
        // normal matched render
        if (match) {
            debugLog('--- NORMAL MATCH FLAG ---');
            if (this.liveState === LiveState.HIDE_RENDER && typeof this.props.onReappear === 'function') {
                this.props.onReappear({ location: location, livePath: livePath, alwaysLive: alwaysLive });
            }
            this.liveState = LiveState.NORMAL_RENDER_MATCHED;
            return match;
        }
        // hide render
        if ((livePathMatch || props.alwaysLive) && this.routeDom) {
            // backup router when from normal match render to hide render
            if (prevMatch) {
                this._latestMatchedRouter = this.context.router;
            }
            if (typeof this.props.onHide === 'function') {
                this.props.onHide({ location: location, livePath: livePath, alwaysLive: alwaysLive });
            }
            debugLog('--- HIDE FLAG ---');
            this.liveState = LiveState.HIDE_RENDER;
            this.saveScrollPosition();
            this.hideRoute();
            return prevMatch;
        }
        // normal unmatched unmount
        debugLog('--- NORMAL UNMATCH FLAG ---');
        this.liveState = LiveState.NORMAL_RENDER_UNMATCHED;
        this.clearScroll();
        this.clearDomData();
    };
    LiveRoute.prototype.computePathsMatch = function (_a, router) {
        var computedMatch = _a.computedMatch, location = _a.location, paths = _a.paths, strict = _a.strict, exact = _a.exact, sensitive = _a.sensitive;
        invariant(router, 'You should not use <Route> or withRouter() outside a <Router>');
        var route = router.route;
        var pathname = (location || route.location).pathname;
        // livePath could accept a string or an array of string
        if (Array.isArray(paths)) {
            for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
                var path = paths_1[_i];
                if (typeof path !== 'string') {
                    continue;
                }
                var currPath = react_router_1.matchPath(pathname, { path: path, strict: strict, exact: exact, sensitive: sensitive }, router.match);
                // return if one of the livePaths is matched
                if (currPath) {
                    return currPath;
                }
            }
            return null;
        }
        else {
            return react_router_1.matchPath(pathname, { path: paths, strict: strict, exact: exact, sensitive: sensitive }, router.match);
        }
    };
    LiveRoute.prototype.computeMatch = function (_a, router) {
        var computedMatch = _a.computedMatch, location = _a.location, path = _a.path, strict = _a.strict, exact = _a.exact, sensitive = _a.sensitive;
        // DO NOT use the computedMatch from Switch!
        // react-live-route: ignore match from <Switch>, actually LiveRoute should not be wrapped by <Switch>.
        // if (computedMatch) return computedMatch // <Switch> already computed the match for us
        invariant(router, 'You should not use <Route> or withRouter() outside a <Router>');
        var route = router.route;
        var pathname = (location || route.location).pathname;
        return react_router_1.matchPath(pathname, { path: path, strict: strict, exact: exact, sensitive: sensitive }, route.match);
    };
    // get DOM of Route
    LiveRoute.prototype.getRouteDom = function () {
        var routeDom = ReactDOM.findDOMNode(this);
        this.routeDom = routeDom;
    };
    // backup scroll and hide DOM
    LiveRoute.prototype.hideRoute = function () {
        if (this.routeDom && this.routeDom.style.display !== 'none') {
            debugLog('--- hide route ---');
            this.previousDisplayStyle = this.routeDom.style.display;
            this.routeDom.style.display = 'none';
        }
    };
    // reveal DOM display
    LiveRoute.prototype.showRoute = function () {
        if (this.routeDom && this.previousDisplayStyle !== null) {
            this.routeDom.style.display = this.previousDisplayStyle;
        }
    };
    // save scroll position before hide DOM
    LiveRoute.prototype.saveScrollPosition = function () {
        if (this.routeDom && this.scrollPosBackup === null) {
            var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
            debugLog("saved top = " + scrollTop + ", left = " + scrollLeft);
            this.scrollPosBackup = { top: scrollTop, left: scrollLeft };
        }
    };
    // restore the scroll position before hide
    LiveRoute.prototype.restoreScrollPosition = function () {
        var scroll = this.scrollPosBackup;
        debugLog(scroll);
        if (scroll && this.routeDom) {
            window.scrollTo(scroll.left, scroll.top);
        }
    };
    // clear scroll position
    LiveRoute.prototype.clearDomData = function () {
        if (this.doesRouteEnableLive()) {
            this.routeDom = null;
            this.previousDisplayStyle = null;
        }
    };
    // clear scroll position
    LiveRoute.prototype.clearScroll = function () {
        if (this.doesRouteEnableLive()) {
            this.scrollPosBackup = null;
        }
    };
    // normally render or unmount Route
    LiveRoute.prototype.renderRoute = function (component, render, props, match) {
        debugLog(match);
        if (component)
            return match ? React.createElement(component, props) : null;
        if (render)
            return match ? render(props) : null;
    };
    LiveRoute.prototype.render = function () {
        var match = this.state.match;
        var _a = this.props, children = _a.children, component = _a.component, render = _a.render, livePath = _a.livePath, alwaysLive = _a.alwaysLive, onHide = _a.onHide;
        var _b = this.context.router, history = _b.history, route = _b.route, staticContext = _b.staticContext;
        var location = this.props.location || route.location;
        var props = { match: match, location: location, history: history, staticContext: staticContext };
        // only affect LiveRoute
        if ((livePath || alwaysLive) && (component || render)) {
            debugLog('=== RENDER FLAG: ' + this.liveState + ' ===');
            if (this.liveState === LiveState.NORMAL_RENDER_MATCHED ||
                this.liveState === LiveState.NORMAL_RENDER_UNMATCHED ||
                this.liveState === LiveState.NORMAL_RENDER_ON_INIT) {
                // normal render
                return this.renderRoute(component, render, props, match);
            }
            else if (this.liveState === LiveState.HIDE_RENDER) {
                // hide render
                var prevRouter = this._latestMatchedRouter;
                var history_1 = prevRouter.history, route_1 = prevRouter.route, staticContext_1 = prevRouter.staticContext; // load properties from prevRouter and fake props of latest normal render
                var liveProps = { match: match, location: location, history: history_1, staticContext: staticContext_1 };
                return this.renderRoute(component, render, liveProps, true);
            }
        }
        // the following is the same as Route of react-router, just render it normally
        if (component)
            return match ? React.createElement(component, props) : null;
        if (render)
            return match ? render(props) : null;
        if (typeof children === 'function')
            return children(props);
        if (children && !isEmptyChildren(children))
            return React.Children.only(children);
        return null;
    };
    LiveRoute.propTypes = {
        computedMatch: PropTypes.object,
        path: PropTypes.string,
        exact: PropTypes.bool,
        strict: PropTypes.bool,
        sensitive: PropTypes.bool,
        component: function (props, propName) {
            if (props[propName] && !react_is_1.isValidElementType(props[propName])) {
                return new Error("Invalid prop 'component' supplied to 'Route': the prop is not a valid React component");
            }
        },
        render: PropTypes.func,
        children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
        location: PropTypes.object,
        onHide: PropTypes.func,
        livePath: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
        alwaysLive: PropTypes.bool,
        name: PropTypes.string // for LiveRoute debug
    };
    LiveRoute.defaultProps = {
        alwaysLive: false
    };
    LiveRoute.contextTypes = {
        router: PropTypes.shape({
            history: PropTypes.object.isRequired,
            route: PropTypes.object.isRequired,
            staticContext: PropTypes.object
        })
    };
    LiveRoute.childContextTypes = {
        router: PropTypes.object.isRequired
    };
    return LiveRoute;
}(React.Component));
exports.LiveRoute = LiveRoute;
//# sourceMappingURL=LiveRoute.js.map