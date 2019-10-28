<p align="center">
    <h1 align="center">react-live-route</h1>
    <p align="center">
        An enhanced version of react-router-v4 Route Component that keeps route component alive on unmatched path and restore it completely on match path.
    <p>
    <p align="center">
        <i>
            <a href="https://www.npmjs.com/package/react-live-route">
              <img src="https://img.shields.io/npm/v/react-live-route.svg?color=%2361AFEF" alt="NPM Version">
            </a>
            <a href="https://circleci.com/gh/fi3ework/react-live-route">
              <img src="https://img.shields.io/circleci/project/github/fi3ework/react-live-route/master.svg?style=flat-square" alt="Build Status">
            </a>
<a href='https://coveralls.io/github/fi3ework/react-live-route'><img src='https://img.shields.io/coveralls/github/fi3ework/react-live-route/master.svg?style=flat-square' alt='Coverage Status' /></a>
        </i>
    </p>
</p>

## Document

[中文](./docs/README-zh.md)

## Feedback

Feel free to open an [issue](https://github.com/fi3ework/react-live-route/issues/new) to ask for help or have a discussion. If there is a detailed code problem help is needed, please fork [this](https://codesandbox.io/s/20pm25081r) minimal demo to provide a reproduce scenario, or your issue might be closed directly due to lack of information.

## Demo

### codeSandbox

You can experience and review the source code on codeSandbox.

[![Edit react-live-route-demo-1](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/yj9j33pw4j)

### QR code

You also can scan the QR code of the demo above to experience it on mobile device.

![qr](./docs/qr.png)

## Install

```bash
npm install react-live-route
```

or

```bash
yarn add react-live-route
```

## About

It will hide component of route instead of unmout it when the path is not match and restore it when come back. There are a few APIs provided to control the hidden condition of component.

Example：

There is a item list page, click on the items on this page will enter the item detail page. When entering the detail page, item list page will be hidden and it will keep hidden when you are on item detail page. Once back to the list page, the list page will be restored to the last state of leaving.

## Features

- ✅ Fully compatible with react-router-v4, all passed the react-router-v4 unit tests.
- 🎯 Completely restored to the state of the last time you left (scroll position included).
- 🔒 Minimally invasive, all you need to do is import LiveRoute.
- ✌️ Super easy API.

## Hint

- **Using with <Switch />, see [Use in `<Switch>`](#Use in `<Switch>`) for detail.**
- **Using with code splitting, see [ensureDidMount](#ensureDidMount (code-splitting)) for detail.**
- If LiveRoute's parent route is unmounted on current location, then it will also be unmounted . This is determined by the top-down design principle of React. You can use LiveRoute to declares a parent route to solve this problem or stop nestting the router.
- In some cases the DOM of LiveRoute will be modified directly and the scroll position will not change when navigation. This is not a problem with react-live-route. You can scroll the screen to the top manually and you may get some help from [this article](https://github.com/ReactTraining/react-router/blob/2b94b8f9e115bec6426be06b309b6963f4a96004/packages/react-router-dom/docs/guides/scroll-restoration.md) from react-router. By the way, if the scroll position will be restored by LiveRoute, it will come up after the scroll operation in componet of LiveRoute due to the render order of React.

## Usage

### 1. Enhance Route with withRouter

The class imported from `react-live-route` **must** be wrapped by `withRouter` to touch the property of context to work as expected.

```jsx
import NotLiveRoute from 'react-live-route'
import { withRouter } from 'react-router-dom'

const LiveRoute = withRouter(NotLiveRoute)
```

### 2. Props of LiveRoute

#### livePath: (string | string[])

`livePath` is the path you want to hide the component instead of unmount it. The specific rules of `livePath` are the same as `path` props of Route in react-router-v4. You still can use `component` or `render` props to render a component.

`livePath` also can accept an array of string above since 1.2.0. `livePath` is matched if any string in the array is matched.

LiveRoute will re-render when it come back from a `path` matching location from the `livePath` matching location. It will unmount on other unmatched locations.

Example:

The route of List will be rendered normally under `/list`, and it will be hidden when location change to `/user/:id`, and it will be unmounted normally when entering other locations.

```tsx
import NotLiveRoute from 'react-live-route'
import { withRouter } from 'react-router-dom'

const LiveRoute = withRouter(NotLiveRoute)

<LiveRoute path="/list" livePath="/user/:id" component={List} />
```

#### alwaysLive: boolean

`alwaysLive` is just like `livePath`. The difference is the component will not be unmount on **any other location** after the it's first mount.

Example:

After the first mount on match location, the Modal page will be hidden when the path is not matched, and will re-render when `path` match again.

```jsx
import NotLiveRoute from 'react-live-route'
import { withRouter } from 'react-router-dom'

const LiveRoute = withRouter(NotLiveRoute)

<LiveRoute path="/list" alwaysLive={true} component={Modal} />
```

#### onHide: (location, match, history, livePath, alwaysLive) => void

This hook will be triggered when LiveRoute will hide in `componentWillReceiveProps` stage (so it happens before re-render).

Example of usage is below.

#### onReappear: (location, match, history, livePath, alwaysLive) => void

This hook will be triggered when LiveRoute will reappear from hide in `componentWillReceiveProps` stage (so it happens before re-render).

```js
import NotLiveRoute from 'react-live-route'
import { withRouter } from 'react-router-dom'

const LiveRoute = withRouter(NotLiveRoute)

<LiveRoute
  path="/items"
  component={List}
  livePath="/item/:id"
  name="items"
  onHide={(location, match, livePath, alwaysLive) => {
    console.log('[on hide]')
  }}
  onReappear={(location, match, livePath, alwaysLive) => {
    console.log('[on reappear]')
    console.log(routeState)
  }}
/>
```

#### forceUnmount: (location, match, history, livePath, alwaysLive) => boolean

forceUnmount is funtion that return a boolean value to decide weather to forceUnmount the LiveRoute no matter it is matched or should be kept lived. 

For example: when the user id equals to `27`, List page will be force unmounted while routing on other value  of id will be kept.

```jsx
import NotLiveRoute from 'react-live-route'
import { withRouter } from 'react-router-dom'

const LiveRoute = withRouter(NotLiveRoute)

<LiveRoute path="/list" livePath="/user/:id" component={List} forceUnmount={(location, match)=> match.params.id === 27}/>
```

### ensureDidMount (code-splitting)

ensureDidMount is useful when using a route with `react-loadable`. Cause `react-loadable` will load the route component asynchronous. So the route component must give a hint to help react-live-route know when the real component is loaded so the DOM could be got.

```jsx
const LoadableItems = Loadable({
  loader: () => import("./list"),
  loading: () => () => <p>xxx</p>
})
```

`List` item:
```jsx
  componentDidMount() {
    this.props.ensureDidMount()
  }
```

## TIPS

### Use in `<Switch>`

There's some stuff extra to do when Using with `<Switch>`. If you want makes `/items` pathname alive, you must put a **placeholder** route where it should be **but renders nothing**. And put LiveRoute out of Switch.

*(You have to do this because keep-alive break the origin `<Switch>` or React philosophy so we have use a placeholder route to keep the philosophy and show the real content out of <Switch>.)*

```tsx
function App() {
  return (
    <div className="App">
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/item/:id" component={Detail} />
        <Route path="/about" component={About} />
        <Route path="/items" /> // placeholder(required)
        <Route path="*" render={NotFound} />
      </Switch>
      <LiveRoute
        path="/items"
        component={List}
        livePath="/item/:id"
        name="items"
        onHide={routeState => {
          console.log("[on hide]");
          console.log(routeState);
        }}
        onReappear={routeState => {
          console.log("[on reappear]");
          console.log(routeState);
        }}
      />
      <Bar />
    </div>
  );
}
```



## Licence

MIT