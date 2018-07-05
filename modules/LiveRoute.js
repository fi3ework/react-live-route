import warning from 'warning'
import invariant from 'invariant'
import React from 'react'
import PropTypes from 'prop-types'
import matchPath from './matchPath'
import ReactDOM from 'react-dom'

const isEmptyChildren = children => React.Children.count(children) === 0
const NORMAL_RENDER = 0
const HIDE_RENDER = 1
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

  constructor(props, context) {
    super(props, context)
    if (props.alwaysLive) {
      this._routeInited = false
    }
    this.liveState = NORMAL_RENDER
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
    if ((this.props.livePath || this.props.alwaysLive) && this.state.match) {
      this._prevRouter = this.context.router
      this.getRouteDom()
      if (this.routeDom) {
        this._routeInited = true
        console.log('--- inited ---')
      }
    }
  }

  componentWillReceiveProps(nextProps, nextContext) {
    console.log('into cwrp')
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
    if (this.props.livePath || this.props.alwaysLive) {
      computedMatch = this.computeMatchWithLive(this.props, nextProps, nextContext, match)
    }

    this.setState({
      match: computedMatch
    })
  }

  // 获取 Route 对应的 DOM
  componentDidUpdate(prevProps, prevState) {
    if ((this.props.livePath || this.props.alwaysLive) && this.state.match) {
      this.getRouteDom()
      if (this.routeDom) {
        this._routeInited = true
        console.log('--- inited ---')
      }
    }
  }

  /**
   *
   *
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
    console.log('进入 livePath')
    console.log(this._routeInited)
    // 计算 livePath 是否匹配
    const livePath = nextProps.livePath
    const nextPropsWithLivePath = { ...nextProps, path: livePath }
    const prevMatch = this.computeMatch(props, this.context.router)
    const livePathMatch = this.computeMatch(nextPropsWithLivePath, nextContext.router)
    if (match || (props.alwaysLive && !this._routeInited)) {
      console.log('------- NORMAL FLAG -------')
      // 正常存活
      this.liveState = NORMAL_RENDER
      this._prevRouter = this.context.router
      return match
    } else if (livePathMatch || props.alwaysLive) {
      // 备份一下需要渲染的参数
      console.log('------- HIDE FLAG-------')
      this.liveState = HIDE_RENDER
      if (prevMatch) {
        this._prevMatch = prevMatch
        return prevMatch
      } else {
        return this._prevMatch
      }
    } else {
      this.liveState = NORMAL_RENDER
      console.log('------- NO MATCH FLAG -------')
    }
  }

  // Route 中正常计算 match
  computeMatch({ computedMatch, location, path, strict, exact, sensitive }, router) {
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
    const previousDisplayStyle = this.routeDom.style.display
    if (this.routeDom && previousDisplayStyle !== 'none') {
      this.saveScroll()
      this._previousDisplayStyle = previousDisplayStyle
      this.routeDom.style.display = 'none'
    }
  }

  // 显示 DOM 并恢复 scroll
  showRoute() {
    if (this.routeDom) {
      this.routeDom.style.display = this._previousDisplayStyle
      this.restoreScroll()
    }
  }

  // 保存离开前的 scroll
  saveScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
    window.sessionStorage.setItem('@@offset', JSON.stringify({ top: scrollTop, left: scrollLeft }))
  }

  // 恢复离开前的 scroll
  restoreScroll = () => {
    const scroll = JSON.parse(window.sessionStorage.getItem('@@offset'))
    console.log(scroll)
    if (typeof scroll.top === 'number') {
      window.scroll({ top: scroll.top, left: scroll.left })
    }
  }

  // 正常渲染 component 或 render
  renderRoute(component, render, props, match) {
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
      if (this.liveState === NORMAL_RENDER) {
        // 正常渲染
        this.showRoute()
        return this.renderRoute(component, render, props, match)
      } else if (this.liveState === HIDE_RENDER) {
        // 隐藏渲染
        const prevRouter = this._prevRouter
        // 取出 prevRouter 中的属性
        const { history, route, staticContext } = prevRouter
        const location = this.props.location || route.location
        const liveProps = { match, location, history, staticContext }
        this.hideRoute()
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
