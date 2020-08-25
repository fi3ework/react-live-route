/* tslint:disable:cyclomatic-complexity */

import { History, Location } from 'history'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { isValidElementType } from 'react-is'
import { match, matchPath, RouteComponentProps, RouteProps } from 'react-router'
import invariant from 'tiny-invariant'
import warning from 'tiny-warning'

declare var __DEV__: boolean

function debugLog(...message: any) {
  if (__DEV__) {
    console.log(...message)
  }
}

function isEmptyChildren(children) {
  return React.Children.count(children) === 0
}

type CacheDom = HTMLElement | null
type LivePath = string | string[] | undefined
interface IMatchOptions {
  path?: string | string[]
  exact?: boolean
  strict?: boolean
  sensitive?: boolean
}

enum SideEffect {
  SAVE_DOM_SCROLL = 'SAVE_DOM_SCROLL',
  RESTORE_DOM_SCROLL = 'RESTORE_DOM_SCROLL',
  CLEAR_DOM_SCROLL = 'CLEAR_DOM_SCROLL',
  RESET_SCROLL = 'RESET_SCROLL',

  HIDE_DOM = 'HIDE_DOM',
  SHOW_DOM = 'SHOW_DOM',
  CLEAR_DOM_DATA = 'CLEAR_DOM_DATA',

  ON_REAPPEAR_HOOK = 'ON_REAPPEAR_HOOK',
  ON_HIDE_HOOK = 'ON_HIDE_HOOK',

  NO_SIDE_EFFECT = 'NO_SIDE_EFFECT'
}

enum LiveState {
  NORMAL_RENDER_ON_INIT = 'normal render (matched or unmatched)',
  NORMAL_RENDER_MATCHED = 'normal matched render',
  HIDE_RENDER = 'hide route when livePath matched',
  NORMAL_RENDER_UNMATCHED = 'normal unmatched render (unmount)'
}

type OnRoutingHook = (
  location: Location,
  match: match | null,
  history: History,
  livePath: LivePath,
  alwaysLive: boolean | undefined
) => any

interface IProps extends RouteProps {
  name?: string
  livePath?: string | string[]
  alwaysLive?: boolean
  onHide?: OnRoutingHook
  onReappear?: OnRoutingHook
  forceUnmount?: OnRoutingHook
  computedMatch?: IMatchOptions
  // history: History
  // match: match
  // staticContext: any
}

/**
 * The public API for matching a single path and rendering.
 */
type PropsType = RouteComponentProps<any> & IProps
class LiveRoute extends React.Component<PropsType, any> {
  public routeDom: CacheDom = null
  public scrollPosBackup: { left: number; top: number } | null = null
  public previousDisplayStyle: string | null = null
  public liveState: LiveState = LiveState.NORMAL_RENDER_ON_INIT
  public currentSideEffect: SideEffect[] = [SideEffect.NO_SIDE_EFFECT]

  public componentDidMount() {
    this.getRouteDom()
  }

  public componentDidUpdate(prevProps, prevState) {
    this.performSideEffects(this.currentSideEffect, [SideEffect.ON_REAPPEAR_HOOK, SideEffect.CLEAR_DOM_DATA])
    this.performSideEffects(this.currentSideEffect, [
      SideEffect.SHOW_DOM,
      SideEffect.RESTORE_DOM_SCROLL,
      SideEffect.CLEAR_DOM_SCROLL
    ])
    this.performSideEffects(this.currentSideEffect, [SideEffect.RESET_SCROLL])
    this.getRouteDom()
  }

  // clear on unmounting
  public componentWillUnmount() {
    this.clearDomData()
    this.clearScroll()
  }

  // get DOM of Route
  public getRouteDom = () => {
    let routeDom: Element | null | Text = null
    try {
      routeDom = ReactDOM.findDOMNode(this)
    } catch {
      // TODO:
    }
    this.routeDom = (routeDom as CacheDom) || this.routeDom
  }

  public hideRoute() {
    if (this.routeDom && this.routeDom.style.display !== 'none') {
      debugLog('--- hide route ---')
      this.previousDisplayStyle = this.routeDom.style.display
      this.routeDom.style.display = 'none'
    }
  }

  // reveal DOM display
  public showRoute() {
    if (this.routeDom && this.previousDisplayStyle !== null) {
      this.routeDom.style.display = this.previousDisplayStyle
    }
  }

  public doesRouteEnableLive() {
    return this.props.livePath || this.props.alwaysLive
  }

  // save scroll position before hide DOM
  public saveScrollPosition() {
    if (this.routeDom && this.scrollPosBackup === null) {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
      debugLog(`saved top = ${scrollTop}, left = ${scrollLeft}`)
      this.scrollPosBackup = { top: scrollTop, left: scrollLeft }
    }
  }

  // restore the scroll position before hide
  public restoreScrollPosition() {
    const scroll = this.scrollPosBackup
    debugLog(scroll)
    if (scroll && this.routeDom) {
      window.scrollTo(scroll.left, scroll.top)
    }
  }

  // reset scroll position
  public resetScrollPosition() {
    if (scroll && this.routeDom) {
      window.scrollTo(0, 0)
    }
  }

  // clear scroll position
  public clearDomData() {
    if (this.doesRouteEnableLive()) {
      this.routeDom = null
      this.previousDisplayStyle = null
    }
  }

  // clear scroll position
  public clearScroll() {
    if (this.doesRouteEnableLive()) {
      this.scrollPosBackup = null
    }
  }

  public isLivePathMatch(
    livePath: LivePath,
    alwaysLive: boolean | undefined,
    pathname: string,
    options: IMatchOptions
  ) {
    const pathArr = Array.isArray(livePath) ? livePath : [livePath]
    if (alwaysLive) {
      pathArr.push('*')
    }
    for (let currPath of pathArr) {
      if (typeof currPath !== 'string') {
        continue
      }

      const currLiveOptions = { ...options, path: currPath }
      const currMatch = matchPath(pathname, currLiveOptions)
      // return if one of the livePaths is matched
      if (currMatch) {
        return currMatch
      }
    }
    // not matched default fallback
    return null
  }

  public performSideEffects = (sideEffects: SideEffect[], range: SideEffect[]) => {
    debugLog(`${this.props.name} perform side effects:`, sideEffects, range)
    const sideEffectsToRun = sideEffects.filter(item => range.indexOf(item) >= 0)
    sideEffectsToRun.forEach((sideEffect, index) => {
      switch (sideEffect) {
        case SideEffect.SAVE_DOM_SCROLL:
          this.saveScrollPosition()
          break
        case SideEffect.HIDE_DOM:
          this.hideRoute()
          break
        case SideEffect.SHOW_DOM:
          this.showRoute()
          break
        case SideEffect.RESTORE_DOM_SCROLL:
          this.restoreScrollPosition()
          break
        case SideEffect.ON_REAPPEAR_HOOK:
          this.onHook('onReappear')
          break
        case SideEffect.ON_HIDE_HOOK:
          this.onHook('onHide')
          break
        case SideEffect.CLEAR_DOM_SCROLL:
          this.clearScroll()
          break
        case SideEffect.RESET_SCROLL:
          this.resetScrollPosition()
          break
        case SideEffect.CLEAR_DOM_DATA:
          this.clearScroll()
          this.clearDomData()
          break
      }
    })

    this.currentSideEffect = sideEffects.filter(item => range.indexOf(item) < 0) as SideEffect[]
  }

  public getSnapshotBeforeUpdate(prevProps, prevState) {
    this.performSideEffects(this.currentSideEffect, [
      SideEffect.ON_HIDE_HOOK,
      SideEffect.SAVE_DOM_SCROLL,
      SideEffect.HIDE_DOM
    ])
    return null
  }

  public onHook = (hookName: 'onHide' | 'onReappear') => {
    const {
      exact = false,
      sensitive = false,
      strict = false,
      path,
      livePath,
      alwaysLive,
      // from withRouter, same as RouterContext.Consumer ⬇️
      history,
      location,
      match,
      staticContext
      // from withRouter, same as RouterContext.Consumer ⬆️
    } = this.props
    const hook = this.props[hookName]
    const context = { history, location, match, staticContext }
    const matchOfPath = this.props.path ? matchPath(location.pathname, this.props) : context.match
    const matchOfLivePath = this.isLivePathMatch(livePath, alwaysLive, location!.pathname, {
      path,
      exact,
      strict,
      sensitive
    })
    const matchAnyway = matchOfPath || matchOfLivePath
    if (typeof hook === 'function') {
      hook(location!, matchAnyway, history, livePath, alwaysLive)
    }
  }

  public render() {
    const {
      exact = false,
      sensitive = false,
      strict = false,
      forceUnmount,
      path,
      livePath,
      alwaysLive,
      component,
      render,
      // from withRouter, same as RouterContext.Consumer ⬇️
      history,
      location,
      match,
      staticContext
      // from withRouter, same as RouterContext.Consumer ⬆️
    } = this.props
    let { children } = this.props
    const context = { history, location, match, staticContext }
    invariant(!!context, 'You should not use <Route> outside a <Router>')

    const matchOfPath = this.props.path ? matchPath(location.pathname, this.props) : context.match
    const matchOfLivePath = this.isLivePathMatch(livePath, alwaysLive, location!.pathname, {
      path,
      exact,
      strict,
      sensitive
    })
    const matchAnyway = matchOfPath || matchOfLivePath

    // no render
    if (
      !matchAnyway ||
      (matchAnyway &&
        !matchOfPath &&
        (this.liveState === LiveState.NORMAL_RENDER_ON_INIT || this.liveState === LiveState.NORMAL_RENDER_UNMATCHED))
    ) {
      debugLog('--- not match ---')
      this.currentSideEffect = [SideEffect.CLEAR_DOM_SCROLL]
      this.liveState = LiveState.NORMAL_RENDER_UNMATCHED
      return null
    }

    // normal render || hide render
    if (matchOfPath) {
      debugLog('--- normal match ---')
      this.currentSideEffect = [SideEffect.RESET_SCROLL]

      // hide ➡️ show
      if (this.liveState === LiveState.HIDE_RENDER) {
        this.currentSideEffect = [
          SideEffect.SHOW_DOM,
          SideEffect.RESTORE_DOM_SCROLL,
          SideEffect.CLEAR_DOM_SCROLL,
          SideEffect.ON_REAPPEAR_HOOK
        ]
      }
      this.liveState = LiveState.NORMAL_RENDER_MATCHED
    } else {
      debugLog('--- hide match ---')
      // force unmount
      if (typeof forceUnmount === 'function' && forceUnmount(location, match, history, livePath, alwaysLive)) {
        this.liveState = LiveState.NORMAL_RENDER_UNMATCHED
        this.currentSideEffect = [SideEffect.CLEAR_DOM_DATA]
        return null
      }

      // show ➡️ hide
      if (this.liveState === LiveState.NORMAL_RENDER_MATCHED) {
        this.currentSideEffect = [SideEffect.ON_HIDE_HOOK, SideEffect.SAVE_DOM_SCROLL, SideEffect.HIDE_DOM]
      }
      this.liveState = LiveState.HIDE_RENDER
    }

    // normal render
    const props = { ...context, location, match: matchOfPath, ensureDidMount: this.getRouteDom }

    // React uses an empty array as children by
    // default, so use null if that's the case.
    if (Array.isArray(children) && children.length === 0) {
      children = null
    }

    if (typeof children === 'function') {
      children = (children as any)(props)

      if (children === undefined) {
        if (__DEV__) {
          const { path } = this.props

          warning(
            false,
            'You returned `undefined` from the `children` function of ' +
              `<Route${path ? ` path="${path}"` : ''}>, but you ` +
              'should have returned a React element or `null`'
          )
        }

        children = null
      }
    }

    const componentInstance = component && React.createElement(component, props)
    const childInstance = children && React.cloneElement(children, props) // clone element to pass props to the child element

    // normal render from Route
    return children && !isEmptyChildren(children)
      ? childInstance
      : matchAnyway
      ? component
        ? componentInstance
        : render
        ? render(props as any)
        : null
      : null
  }
}

/* tslint:disable:no-invalid-this */
if (__DEV__) {
  LiveRoute.prototype.componentDidMount = function() {
    warning(
      !(this.props.children && !isEmptyChildren(this.props.children) && this.props.component),
      'You should not use <Route component> and <Route children> in the same route; <Route component> will be ignored'
    )

    warning(
      !(this.props.children && !isEmptyChildren(this.props.children) && this.props.render),
      'You should not use <Route render> and <Route children> in the same route; <Route render> will be ignored'
    )

    warning(
      !(this.props.component && this.props.render),
      'You should not use <Route component> and <Route render> in the same route; <Route render> will be ignored'
    )
  }

  LiveRoute.prototype.componentDidUpdate = function(prevProps) {
    warning(
      !(this.props.location && !prevProps.location),
      '<Route> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.'
    )

    warning(
      !(!this.props.location && prevProps.location),
      '<Route> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.'
    )
  }
}

export default LiveRoute
