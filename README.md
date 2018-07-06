An enhanced version of react-router-v4 **Route** Component that keeps route component alive on unmatched path and recover it completely on match path.

## Document

[中文](./docs/README-zh.md)

## Demo

### codeSandbox

You can experience react-live-route on codeSandbox.

[![Edit react-live-route-demo-1](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/yj9j33pw4j)

### QR code

You also can scan the QR code of the demo above to experience it on mobile device.

![qr](./docs/qr.png)

## Install

```bash
npm install react-live-route --save-dev
```

## About

It can keeps component of route hidden (alive) instead of unmout when the path is not match. There are a few APIs provided to control the life cycle of component.

Example：

We have a list page, click on the items in the list page will enter the details page, when entering the details page, the list page will be hidden, when returning to the list page, the list page will revert to the last time you left.

## Features

- ✅ Fully compatible with react-router-4, all passed the react-router-v4 unit tests.
- 📦 Completely restored the last time you left the page (scroll position included).
- 🎯 Minimally invasive, all you need to do is importing a LiveRoute.
- ✌️ Blazing easy API.

## ⚠️ Caveat

- LiveRoute **SHOULD NOT** be wrapped by `Switch` directly, because `Switch` only render the first matched component so that LiveRoute may be directly skipped.
- If a route uses LiveRoute and the parent route of the current route is unmounted, then it will be unmounted whether or not livePath is match. This is determined by the top-down design principle of React. You can use LiveRoute to declares a parent route to solve this problem or stop nestting the router.

## API

### livePath

`livePath` is the path of the page that needs to be hidden instead of unmounted. The specific rules of `livePath` are the same as `path` props of Route in react-router-v4. You still can use `component` or `render` props to render a component.

Example:

The route of List will be rendered normally under `/list`, and it will be hidden when entering `/user/:id`, and it will be unmounted normally when entering  other location.

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" livePath="/user/:id" component={List} />
```

### alwaysLive

`alwaysLive` is just like `livePath`.  It will be re-render when goes back to match location. But the difference is the component will not be unmount on **any other location** after the first mount. 

Example: 

After the first mount on match location, the Modal page will be hidden when the path is not matched, and will be re-render when match again.

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" alwaysLive={true} component={Modal}/>
```

## Licence

MIT