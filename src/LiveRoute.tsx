import { History, Location } from 'history'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { isValidElementType } from 'react-is'
import { match, matchPath, RouteProps } from 'react-router'
import invariant from 'tiny-invariant'
import warning from 'tiny-warning'

declare var __DEV__: boolean

function debugLog(message: any) {
  // console.log(message)
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
enum LiveState {
  NORMAL_RENDER_MATCHED = 'normal matched render',
  NORMAL_RENDER_UNMATCHED = 'normal unmatched render (unmount)',
  NORMAL_RENDER_ON_INIT = 'normal render (matched or unmatched)',
  HIDE_RENDER = 'hide route when livePath matched'
}

type OnRoutingHook = (location: Location, match: match | null, livePath: LivePath, alwaysLive: boolean) => any

interface IProps extends RouteProps {
  name?: string
  livePath?: string | string[]
  alwaysLive: boolean
  onHide?: OnRoutingHook
  onReappear?: OnRoutingHook
  forceUnmount?: OnRoutingHook
  history: History
  match: match
  staticContext: any
}

/**
 * The public API for matching a single path and rendering.
 */
class LiveRoute extends React.Component<IProps, any> {
  public routeDom: CacheDom = null
  public scrollPosBackup: { left: number; top: number } | null = null
  public previousDisplayStyle: string | null = null
  public liveState: LiveState = LiveState.NORMAL_RENDER_ON_INIT

  public componentDidMount() {
    this.getRouteDom()
  }

  // get route of DOM
  public componentDidUpdate(prevProps, prevState) {
    // if (!this.doesRouteEnableLive()) {
    //   return
    // }

    // // restore display when matched normally
    // debugLog(this.liveState)
    // if (this.liveState === LiveState.NORMAL_RENDER_MATCHED) {
    //   this.showRoute()
    //   this.restoreScrollPosition()
    //   this.clearScroll()
    // }

    // get DOM if match and render
    this.getRouteDom()
  }

  // clear on unmounting
  public componentWillUnmount() {
    this.clearScroll()
  }

  // get DOM of Route
  public getRouteDom() {
    let routeDom = ReactDOM.findDOMNode(this)
    this.routeDom = routeDom as CacheDom
  }

  public hideRoute() {
    console.log(this.routeDom)
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

  public isLivePathMatch(livePath: LivePath, pathname: string, options: IMatchOptions) {
    for (let currPath of Array.isArray(livePath) ? livePath : [livePath]) {
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

  public render() {
    console.log(this.props)
    const {
      exact = false,
      sensitive = false,
      strict = false,
      history,
      onReappear,
      onHide,
      forceUnmount,
      location,
      match: matchFromProps,
      path,
      livePath,
      alwaysLive,
      component,
      render,
      staticContext
    } = this.props
    let { children } = this.props

    const matchOfPath = matchPath((location as any).pathname, this.props)
    const matchOfLivePath = this.isLivePathMatch(livePath, location!.pathname, {
      path,
      exact,
      strict,
      sensitive
    })
    const matchAnyway = matchOfPath || matchOfLivePath

    // normal render
    if (matchOfPath) {
      this.showRoute()
      this.restoreScrollPosition()
      this.clearScroll()

      // hide -> show
      if (this.liveState === LiveState.HIDE_RENDER) {
        if (typeof onReappear === 'function') {
          onReappear(location!, matchAnyway, livePath, alwaysLive)
        }
      }
      this.liveState = LiveState.NORMAL_RENDER_MATCHED
    }

    // hide render
    if (!matchOfPath && matchAnyway) {
      this.saveScrollPosition()
      this.hideRoute()

      // show -> hide
      if (this.liveState === LiveState.NORMAL_RENDER_MATCHED) {
        if (typeof onHide === 'function') {
          onHide(location!, matchAnyway, livePath, alwaysLive)
        }
      }
      this.liveState = LiveState.HIDE_RENDER
    }

    const props = { ...staticContext, location, match: matchAnyway }

    // Preact uses an empty array as children by
    // default, so use null if that's the case.
    if (Array.isArray(children) && children.length === 0) {
      children = null
    }

    if (typeof children === 'function') {
      children = (children as any)(props)

      if (children === undefined) {
        // if (__DEV__) {
        //   const { path } = this.props

        //   warning(
        //     false,
        //     'You returned `undefined` from the `children` function of ' +
        //       `<Route${path ? ` path="${path}"` : ''}>, but you ` +
        //       'should have returned a React element or `null`'
        //   )
        // }

        children = null
      }
    }

    //

    // normal render from Route
    return children && !isEmptyChildren(children)
      ? children
      : props.match
      ? component
        ? React.createElement(component, props)
        : render
        ? render(props)
        : null
      : null
  }
}

/* tslint:disable:no-invalid-this */
// if (__DEV__) {
//   LiveRoute.prototype.componentDidMount = function() {
//     warning(
//       !(this.props.children && !isEmptyChildren(this.props.children) && this.props.component),
//       'You should not use <Route component> and <Route children> in the same route; <Route component> will be ignored'
//     )

//     warning(
//       !(this.props.children && !isEmptyChildren(this.props.children) && this.props.render),
//       'You should not use <Route render> and <Route children> in the same route; <Route render> will be ignored'
//     )

//     warning(
//       !(this.props.component && this.props.render),
//       'You should not use <Route component> and <Route render> in the same route; <Route render> will be ignored'
//     )
//   }

//   LiveRoute.prototype.componentDidUpdate = function(prevProps) {
//     warning(
//       !(this.props.location && !prevProps.location),
//       '<Route> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.'
//     )

//     warning(
//       !(!this.props.location && prevProps.location),
//       '<Route> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.'
//     )
//   }
// }

export default LiveRoute
