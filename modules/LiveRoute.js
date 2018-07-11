import warning from 'warning'
import invariant from 'invariant'
import React from 'react'
import PropTypes from 'prop-types'
import matchPath from './matchPath'
import ReactDOM from 'react-dom'

const isEmptyChildren = children => React.Children.count(children) === 0
const NORMAL_RENDER_MATCH = 'normal matched render'
const NORMAL_RENDER_UNMATCH = 'normal unmatched render (unmount)'
const NORMAL_RENDER_INIT = 'normal render'
const HIDE_RENDER = 'hide route when matched'
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
    alwaysLive: PropTypes.bool
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

  liveState = NORMAL_RENDER_INIT
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

  // 获取 Route 对应的 DOM
  componentDidMount() {
    // 需要在这里模仿 cwrp 保存一下 router
    if (this.doesRouteEnableLive() && this.state.match) {
      this._prevRouter = this.context.router
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

    // 如果是 live 路由，需要重新计算 match
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

    // 是正常的显示渲染
    console.log(this.liveState)
    if (this.liveState === NORMAL_RENDER_MATCH) {
      console.log('1111')
      this.showRoute()
      this.restoreScroll()
    }

    // 正常渲染标记 DOM
    if (this.state.match) {
      this.getRouteDom()
    }
  }

  componentWillUnmount() {
    if (this.doesRouteEnableLive()) {
      this.scrollPosBackup = null
    }
  }

  doesRouteEnableLive() {
    return this.props.livePath || this.props.alwaysLive
  }

  /**
   * @param {*} props: this.props
   * @param {*} nextProps: nextProps
   * @param {*} nextContext: nextContext
   * @param {*} match: 当前路径的 match
   * @returns
   * 如果当前的 path 匹配，则返回正常的 match。
   * 如果当前的 livePath 匹配，则返回最近一次正常渲染的 match。
   * 如果当前的 livePath 不匹配，则返回正常计算的 match。
   * @memberof Route
   * 在每次正常渲染的时候，都备份它当前的 router，备份给下一次的 livePath 渲染。
   * 在每次隐藏渲染的时候，都返回一个 prevMatch，等到渲染的时候，它拿这次的 prevMatch 和之前的 router 去最终渲染。
   */
  computeMatchWithLive(props, nextProps, nextContext, match) {
    console.log(`>>>>>> ` + this.props.name + ` <<<<<`)
    // 计算 livePath 是否匹配
    const livePath = nextProps.livePath
    const nextPropsWithLivePath = { ...nextProps, path: livePath }
    const prevMatch = this.computeMatch(props, this.context.router)
    const livePathMatch = this.computeMatch(nextPropsWithLivePath, nextContext.router)
    if (match) {
      // 匹配正常渲染
      console.log('---- NORMAL MATCH FLAG ----')
      this.liveState = NORMAL_RENDER_MATCH
      this._prevRouter = this.context.router
      return match
    } else if ((livePathMatch || props.alwaysLive) && this.routeDom) {
      // 隐藏渲染
      console.log('---- HIDE FLAG----')
      this.liveState = HIDE_RENDER
      this.saveScroll()
      this.hideRoute()
      return prevMatch
    } else {
      // 不匹配正常卸载
      console.log('---- NORMAL UNMATCH FLAG----')
      this.liveState = NORMAL_RENDER_UNMATCH
      this.routeDom = null
      this.scrollPosBackup = null
      this.previousDisplayStyle = null
    }
  }

  computeMatch({ computedMatch, location, path, strict, exact, sensitive }, router) {
    // react-live-route: ignore match from <Switch>, actually LiveRoute should not be wrapped by <Switch>.
    // if (computedMatch) return computedMatch // <Switch> already computed the match for us

    invariant(router, 'You should not use <Route> or withRouter() outside a <Router>')

    const { route } = router
    const pathname = (location || route.location).pathname

    return matchPath(pathname, { path, strict, exact, sensitive }, route.match)
  }

  // 获取 Route 对应的 DOM
  getRouteDom() {
    let routeDom = ReactDOM.findDOMNode(this)
    this.routeDom = routeDom
  }

  // 隐藏 DOM 并保存 scroll
  hideRoute() {
    console.log('--- hide route ---')
    if (this.routeDom && this.routeDom.style.display !== 'none') {
      this.previousDisplayStyle = this.routeDom.style.display
      this.routeDom.style.display = 'none'
    }
  }

  // 显示 DOM 并恢复 scroll
  showRoute() {
    if (this.routeDom && this.previousDisplayStyle !== null) {
      this.routeDom.style.display = this.previousDisplayStyle
    }
  }

  // 保存离开前的 scroll
  saveScroll = () => {
    if (this.routeDom && this.scrollPosBackup === null) {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
      console.log(`saved top = ${scrollTop}, left = ${scrollLeft}`)
      this.scrollPosBackup = { top: scrollTop, left: scrollLeft }
    }
  }

  // 恢复离开前的 scroll
  restoreScroll = () => {
    const scroll = this.scrollPosBackup
    console.log(scroll)
    if (scroll && this.routeDom) {
      window.scroll({ top: scroll.top, left: scroll.left })
    }
  }

  // 正常渲染 component 或 render
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
        this.liveState === NORMAL_RENDER_MATCH ||
        this.liveState === NORMAL_RENDER_UNMATCH ||
        this.liveState === NORMAL_RENDER_INIT
      ) {
        // 正常渲染
        return this.renderRoute(component, render, props, match)
      } else if (this.liveState === HIDE_RENDER) {
        // 隐藏渲染
        const prevRouter = this._prevRouter
        // 取出 prevRouter 中的属性 mock 出上次正常渲染的 props
        const { history, route, staticContext } = prevRouter
        const location = this.props.location || route.location
        const liveProps = { match, location, history, staticContext }
        return this.renderRoute(component, render, liveProps, true)
      }
    }

    // 以下是 Route 的正常渲染
    if (component) return match ? React.createElement(component, props) : null

    if (render) return match ? render(props) : null

    if (typeof children === 'function') return children(props)

    if (children && !isEmptyChildren(children)) return React.Children.only(children)

    return null
  }
}

export default Route
