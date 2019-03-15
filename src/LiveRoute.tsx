import * as warning from 'warning'
import * as invariant from 'invariant'
import * as React from 'react'
import * as PropTypes from 'prop-types'
import * as ReactDOM from 'react-dom'
import { matchPath, Route, RouteProps } from 'react-router'
import { isValidElementType } from 'react-is'

const isEmptyChildren = children => React.Children.count(children) === 0

enum LiveState {
  NORMAL_RENDER_MATCHED = 'normal matched render',
  NORMAL_RENDER_UNMATCHED = 'normal unmatched render (unmount)',
  NORMAL_RENDER_ON_INIT = 'normal render (matched or unmatched)',
  HIDE_RENDER = 'hide route when livePath matched'
}

type CacheDom = HTMLElement | null

interface IProps extends RouteProps {
  livePath?: string | string[]
  alwaysLive: boolean
  onHide?: Function
  onReappear?: Function
  name?: string
}

const debugLog = (...messages: string[]) => {
  // console.log(...messages)
}

/**
 * The public API for matching a single path and rendering.
 */
class LiveRoute extends React.Component<IProps, any> {
  static propTypes = {
    computedMatch: PropTypes.object, // private, from <Switch>
    path: PropTypes.string,
    exact: PropTypes.bool,
    strict: PropTypes.bool,
    sensitive: PropTypes.bool,
    component: (props, propName): any => {
      if (props[propName] && !isValidElementType(props[propName])) {
        return new Error(`Invalid prop 'component' supplied to 'Route': the prop is not a valid React component`)
      }
    },
    render: PropTypes.func,
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
    location: PropTypes.object,
    onHide: PropTypes.func,
    livePath: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    alwaysLive: PropTypes.bool,
    name: PropTypes.string // for LiveRoute debug
  }

  static defaultProps = {
    alwaysLive: false
  }

  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.object.isRequired,
      route: PropTypes.object.isRequired,
      staticContext: PropTypes.object
    })
  }

  static childContextTypes = {
    router: PropTypes.object.isRequired
  }

  _latestMatchedRouter: any
  routeDom: CacheDom = null

  getChildContext() {
    return {
      router: {
        ...this.context.router,
        route: {
          location: this.props.location || this.context.router.route.location,
          match: this.state.match
        }
      }
    }
  }

  state = {
    match: this.computeMatch(this.props as any, this.context.router)
  }

  liveState: LiveState = LiveState.NORMAL_RENDER_ON_INIT
  scrollPosBackup: { left: number; top: number } | null = null
  previousDisplayStyle: string | null = null

  componentWillMount() {
    warning(
      !(this.props.component && this.props.render),
      'You should not use <Route component> and <Route render> in the same route; <Route render> will be ignored'
    )

    warning(
      !(this.props.component && this.props.children && !isEmptyChildren(this.props.children)),
      'You should not use <Route component> and <Route children> in the same route; <Route children> will be ignored'
    )

    warning(
      !(this.props.render && this.props.children && !isEmptyChildren(this.props.children)),
      'You should not use <Route render> and <Route children> in the same route; <Route children> will be ignored'
    )
  }

  componentDidMount() {
    // backup router and get DOM when mounting
    if (this.doesRouteEnableLive() && this.state.match) {
      this._latestMatchedRouter = this.context.router
      this.getRouteDom()
    }
  }

  componentWillReceiveProps(nextProps, nextContext) {
    warning(
      !(nextProps.location && !this.props.location),
      '<Route> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.'
    )

    warning(
      !(!nextProps.location && this.props.location),
      '<Route> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.'
    )

    let match = this.computeMatch(nextProps, nextContext.router)
    let computedMatch = match

    // recompute match if enable live
    if (this.doesRouteEnableLive()) {
      computedMatch = this.computeMatchWithLive(this.props, nextProps, nextContext, match)
    }

    this.setState({
      match: computedMatch
    })
  }

  // get route of DOM
  componentDidUpdate(prevProps, prevState) {
    if (!this.doesRouteEnableLive()) {
      return
    }

    // restore display when matched normally
    debugLog(this.liveState)
    if (this.liveState === LiveState.NORMAL_RENDER_MATCHED) {
      this.showRoute()
      this.restoreScrollPosition()
      this.clearScroll()
    }

    // get DOM if match and render
    if (this.state.match) {
      this.getRouteDom()
    }
  }

  // clear on unmounting
  componentWillUnmount() {
    this.clearScroll()
  }

  doesRouteEnableLive() {
    return this.props.livePath || this.props.alwaysLive
  }

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
  computeMatchWithLive(props, nextProps, nextContext, match) {
    debugLog(`>>>  name: ${this.props.name}  <<<`)
    // compute if livePath match
    const { livePath, alwaysLive } = nextProps
    const nextPropsWithLivePath = { ...nextProps, paths: livePath }
    const prevMatch = this.computeMatch(props, this.context.router)
    const livePathMatch = this.computePathsMatch(nextPropsWithLivePath, nextContext.router)

    // normal matched render
    if (match) {
      debugLog('--- NORMAL MATCH FLAG ---')
      if (this.liveState === LiveState.HIDE_RENDER && typeof this.props.onReappear === 'function') {
        this.props.onReappear({ location, livePath, alwaysLive })
      }
      this.liveState = LiveState.NORMAL_RENDER_MATCHED
      return match
    }

    // hide render
    if ((livePathMatch || props.alwaysLive) && this.routeDom) {
      // backup router when from normal match render to hide render
      if (prevMatch) {
        this._latestMatchedRouter = this.context.router
      }
      if (typeof this.props.onHide === 'function') {
        this.props.onHide({ location, livePath, alwaysLive })
      }
      debugLog('--- HIDE FLAG ---')
      this.liveState = LiveState.HIDE_RENDER
      this.saveScrollPosition()
      this.hideRoute()
      return prevMatch
    }

    // normal unmatched unmount
    debugLog('--- NORMAL UNMATCH FLAG ---')
    this.liveState = LiveState.NORMAL_RENDER_UNMATCHED
    this.clearScroll()
    this.clearDomData()
  }

  computePathsMatch({ computedMatch, location, paths, strict, exact, sensitive }, router) {
    invariant(router, 'You should not use <Route> or withRouter() outside a <Router>')
    const { route } = router
    const pathname = (location || route.location).pathname

    // livePath could accept a string or an array of string
    if (Array.isArray(paths)) {
      for (let path of paths) {
        if (typeof path !== 'string') {
          continue
        }
        const currPath = matchPath(pathname, { path, strict, exact, sensitive }, router.match)
        // return if one of the livePaths is matched
        if (currPath) {
          return currPath
        }
      }
      return null
    } else {
      return matchPath(pathname, { path: paths, strict, exact, sensitive }, router.match)
    }
  }

  computeMatch({ computedMatch, location, path, strict, exact, sensitive }, router) {
    // DO NOT use the computedMatch from Switch!
    // react-live-route: ignore match from <Switch>, actually LiveRoute should not be wrapped by <Switch>.
    // if (computedMatch) return computedMatch // <Switch> already computed the match for us
    invariant(router, 'You should not use <Route> or withRouter() outside a <Router>')

    const { route } = router
    const pathname = (location || route.location).pathname

    return matchPath(pathname, { path, strict, exact, sensitive }, route.match)
  }

  // get DOM of Route
  getRouteDom() {
    let routeDom = ReactDOM.findDOMNode(this)
    this.routeDom = routeDom as CacheDom
  }

  // backup scroll and hide DOM
  hideRoute() {
    if (this.routeDom && this.routeDom.style.display !== 'none') {
      debugLog('--- hide route ---')
      this.previousDisplayStyle = this.routeDom.style.display
      this.routeDom.style.display = 'none'
    }
  }

  // reveal DOM display
  showRoute() {
    if (this.routeDom && this.previousDisplayStyle !== null) {
      this.routeDom.style.display = this.previousDisplayStyle
    }
  }

  // save scroll position before hide DOM
  saveScrollPosition() {
    if (this.routeDom && this.scrollPosBackup === null) {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
      debugLog(`saved top = ${scrollTop}, left = ${scrollLeft}`)
      this.scrollPosBackup = { top: scrollTop, left: scrollLeft }
    }
  }

  // restore the scroll position before hide
  restoreScrollPosition() {
    const scroll = this.scrollPosBackup
    debugLog(scroll)
    if (scroll && this.routeDom) {
      window.scrollTo(scroll.left, scroll.top)
    }
  }

  // clear scroll position
  clearDomData() {
    if (this.doesRouteEnableLive()) {
      this.routeDom = null
      this.previousDisplayStyle = null
    }
  }

  // clear scroll position
  clearScroll() {
    if (this.doesRouteEnableLive()) {
      this.scrollPosBackup = null
    }
  }

  // normally render or unmount Route
  renderRoute(component, render, props, match) {
    debugLog(match)
    if (component) return match ? React.createElement(component, props) : null
    if (render) return match ? render(props) : null
  }

  render() {
    const { match } = this.state
    const { children, component, render: propRender, livePath, alwaysLive, onHide } = this.props
    const { history, route, staticContext } = this.context.router
    const location = this.props.location || route.location
    const props = { match, location, history, staticContext }

    // only affect LiveRoute
    if ((livePath || alwaysLive) && (component || propRender)) {
      debugLog('=== RENDER FLAG: ' + this.liveState + ' ===')
      if (
        this.liveState === LiveState.NORMAL_RENDER_MATCHED ||
        this.liveState === LiveState.NORMAL_RENDER_UNMATCHED ||
        this.liveState === LiveState.NORMAL_RENDER_ON_INIT
      ) {
        // normal render
        return this.renderRoute(component, propRender, props, match)
      } else if (this.liveState === LiveState.HIDE_RENDER) {
        // hide render
        const prevRouter = this._latestMatchedRouter
        const { history, route, staticContext } = prevRouter // load properties from prevRouter and fake props of latest normal render
        const liveProps = { match, location, history, staticContext }
        return this.renderRoute(component, propRender, liveProps, true)
      }
    }

    // the following is the same as Route of react-router, just render it normally
    if (component) return match ? React.createElement(component, props) : null

    if (propRender) return match ? propRender(props as any) : null

    if (typeof children === 'function') return (children as any)(props)

    if (children && !isEmptyChildren(children)) return React.Children.only(children)

    return null
  }
}

export { LiveRoute }
