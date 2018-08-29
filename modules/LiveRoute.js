import warning from 'warning'
import invariant from 'invariant'
import React from 'react'
import PropTypes from 'prop-types'
import matchPath from './matchPath'
import ReactDOM from 'react-dom'

const isEmptyChildren = children => React.Children.count(children) === 0
const NORMAL_RENDER_MATCHED = 'normal matched render'
const NORMAL_RENDER_UNMATCHED = 'normal unmatched render (unmount)'
const NORMAL_RENDER_ON_INIT = 'normal render (matched or unmatched)'
const HIDE_RENDER = 'hide route when livePath matched'
/**
 * The public API for matching a single path and rendering.
 */
class Route extends React.Component {
  static propTypes = {
    computedMatch: PropTypes.object, // private, from <Switch>
    path: PropTypes.string,
    exact: PropTypes.bool,
    strict: PropTypes.bool,
    sensitive: PropTypes.bool,
    component: PropTypes.func,
    render: PropTypes.func,
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
    location: PropTypes.object,
    livePath: PropTypes.string,
    alwaysLive: PropTypes.bool,
    name: PropTypes.string // for LiveRoute debug
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
    match: this.computeMatch(this.props, this.context.router)
  }

  liveState = NORMAL_RENDER_ON_INIT
  scrollPosBackup = null
  previousDisplayStyle = null

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

  // 获取 Route 对应的 DOM
  componentDidUpdate(prevProps, prevState) {
    if (!this.doesRouteEnableLive()) {
      return
    }

    // restore display when matched normally
    console.log(this.liveState)
    if (this.liveState === NORMAL_RENDER_MATCHED) {
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
    console.log(`>>> ` + this.props.name + ` <<<`)
    // compute if livePath match
    const livePath = nextProps.livePath
    const nextPropsWithLivePath = { ...nextProps, path: livePath }
    const prevMatch = this.computeMatch(props, this.context.router)
    const livePathMatch = this.computeMatch(nextPropsWithLivePath, nextContext.router)
    if (match) {
      // normal matched render
      console.log('--- NORMAL MATCH FLAG ---')
      this.liveState = NORMAL_RENDER_MATCHED
      return match
    } else if ((livePathMatch || props.alwaysLive) && this.routeDom) {
      // backup router when from normal match render to hide render
      if (prevMatch) {
        this._latestMatchedRouter = this.context.router
      }
      // hide render
      console.log('--- HIDE FLAG ---')
      this.liveState = HIDE_RENDER
      this.saveScrollPosition()
      this.hideRoute()
      return prevMatch
    } else {
      // normal unmatched unmount
      console.log('--- NORMAL UNMATCH FLAG ---')
      this.liveState = NORMAL_RENDER_UNMATCHED
      this.clearScroll()
      this.clearDomData()
    }
  }

  computeMatch({ computedMatch, location, path, strict, exact, sensitive }, router) {
    // react-live-route: ignore match from <Switch>, actually LiveRoute should not be wrapped by <Switch>.

    // DO NOT use the computedMatch from Switch!
    // if (computedMatch) return computedMatch // <Switch> already computed the match for us
    invariant(router, 'You should not use <Route> or withRouter() outside a <Router>')

    const { route } = router
    const pathname = (location || route.location).pathname

    return matchPath(pathname, { path, strict, exact, sensitive }, route.match)
  }

  // get DOM of Route
  getRouteDom() {
    let routeDom = ReactDOM.findDOMNode(this)
    this.routeDom = routeDom
  }

  // backup scroll and hide DOM
  hideRoute() {
    if (this.routeDom && this.routeDom.style.display !== 'none') {
      console.log('--- hide route ---')
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
      console.log(`saved top = ${scrollTop}, left = ${scrollLeft}`)
      this.scrollPosBackup = { top: scrollTop, left: scrollLeft }
    }
  }

  // restore the scroll position before hide
  restoreScrollPosition() {
    const scroll = this.scrollPosBackup
    console.log(scroll)
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
    console.log(match)
    if (component) return match ? React.createElement(component, props) : null
    if (render) return match ? render(props) : null
  }

  render() {
    const { match } = this.state
    const { children, component, render, livePath, alwaysLive } = this.props
    const { history, route, staticContext } = this.context.router
    const location = this.props.location || route.location
    const props = { match, location, history, staticContext }
    if ((livePath || alwaysLive) && (component || render)) {
      console.log('=== RENDER FLAG: ' + this.liveState + ' ===')
      if (
        this.liveState === NORMAL_RENDER_MATCHED ||
        this.liveState === NORMAL_RENDER_UNMATCHED ||
        this.liveState === NORMAL_RENDER_ON_INIT
      ) {
        // normal render
        return this.renderRoute(component, render, props, match)
      } else if (this.liveState === HIDE_RENDER) {
        // hide render
        const prevRouter = this._latestMatchedRouter
        // load properties from prevRouter and fake props of latest normal render
        const { history, route, staticContext } = prevRouter
        const location = this.props.location || route.location
        const liveProps = { match, location, history, staticContext }
        return this.renderRoute(component, render, liveProps, true)
      }
    }

    // the following is the same as Route of react-router, just render it normally
    if (component) return match ? React.createElement(component, props) : null

    if (render) return match ? render(props) : null

    if (typeof children === 'function') return children(props)

    if (children && !isEmptyChildren(children)) return React.Children.only(children)

    return null
  }
}

export default Route
