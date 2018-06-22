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
    location: PropTypes.object
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

  computeMatch({ computedMatch, location, path, strict, exact, sensitive }, router) {
    if (computedMatch) return computedMatch // <Switch> already computed the match for us

    invariant(router, 'You should not use <Route> or withRouter() outside a <Router>')

    const { route } = router
    const pathname = (location || route.location).pathname

    return matchPath(pathname, { path, strict, exact, sensitive }, route.match)
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

  /**
   *
   *
   * @param {*} props: this.props
   * @param {*} nextProps: nextProps
   * @param {*} nextContext: nextContext
   * @param {*} match: match
   * @returns 如果当前的 livePath 匹配，则返回最近一次正常渲染的 match。
   *          如果当前的 livePath 不匹配，则返回正常计算的 match。
   * @memberof Route
   * 在每次正常渲染的时候，都备份它当前的 router，备份给下一次的 livePath 渲染。
   * 在每次隐藏渲染的时候，都返回一个 prevMatch，等到渲染的时候，它拿这次的 prevMatch 和之前的 router 去最终渲染。
   */
  computeLivePath(props, nextProps, nextContext, match) {
    console.log('进入 livePath')
    // 计算 livePath 是否匹配
    const livePath = nextProps.livePath
    const nextPropsWithLivePath = { ...nextProps, path: livePath }
    const livePathMatch = this.computeMatch(nextPropsWithLivePath, nextContext.router)
    if (match) {
      console.log('--- NORMAL ---')
      // 正常存活
      this.liveState = NORMAL_RENDER
      this._prevRouter = this.context.router
      return match
    } else if (livePathMatch) {
      // 备份一下需要渲染的参数
      console.log('--- HIDE ---')
      this.liveState = HIDE_RENDER
      const prevMatch = this.computeMatch(props, this.context.router)
      return prevMatch
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

    const match = this.computeMatch(nextProps, nextContext.router)
    let computedMatch = match

    // 如果是 livePath 页面，需要重新计算 match
    if (this.props.livePath) {
      computedMatch = this.computeLivePath(this.props, nextProps, nextContext, match)
    }

    this.setState({
      match: computedMatch
    })
  }

  // 获取 Route 对应的 DOM
  getRouteDom() {
    let routeDom = ReactDOM.findDOMNode(this)
    console.log(routeDom)
    this.routeDom = routeDom
  }

  // 获取 Route 对应的 DOM
  componentDidMount() {
    // 需要在这里模仿 cwrp 保存一下 router
    if (this.props.livePath && this.state.match) {
      this._prevRouter = this.context.router
      this.getRouteDom()
    }
  }

  // 获取 Route 对应的 DOM
  componentDidUpdate(prevProps, prevState) {
    if (this.props.livePath && this.state.match) {
      this.getRouteDom()
    }
  }

  // 隐藏 DOM
  hideRoute() {
    if (this.routeDom) {
      const _previousDisplayStyle = this.routeDom.style.display
      this._previousDisplayStyle = _previousDisplayStyle
      console.log(_previousDisplayStyle)
      this.routeDom.style.display = 'none'
    }
  }

  // 显示 DOM
  showRoute() {
    if (this.routeDom) {
      this.routeDom.style.display = this._previousDisplayStyle
    }
  }

  render() {
    const { match } = this.state
    const { children, component, render, livePath } = this.props
    const { history, route, staticContext } = this.context.router
    const location = this.props.location || route.location
    const props = { match, location, history, staticContext }

    // 如果已经初始化 && 需要判断是否靠 key 存活
    if (livePath && component) {
      // 正常渲染
      if (this.liveState === NORMAL_RENDER) {
        this.showRoute()
        return match ? React.createElement(component, props) : null
      }
      // 隐藏渲染
      else if (this.liveState === HIDE_RENDER) {
        console.log('取出的 _prevRouter')
        console.log(this._prevRouter)
        const prevRouter = this._prevRouter

        const { history, route, staticContext } = prevRouter
        const location = this.props.location || route.location
        const liveProps = { match, location, history, staticContext }
        this.hideRoute()
        return React.createElement(component, liveProps)
      } else {
        console.log('react-live-router: this is mount render, will do nothing.')
      }
    }

    if (component) return match ? React.createElement(component, props) : null

    if (render) return match ? render(props) : null

    if (typeof children === 'function') return children(props)

    if (children && !isEmptyChildren(children)) return React.Children.only(children)

    return null
  }
}

export default Route
