**react-router-v4 Route** 组件的加强版，可以保持路由的组件在路径不匹配时隐藏而不卸载，而在回到返回到匹配路径时完全恢复离开页面时的样子。

## 文档

[English](../README.md)

## Demo

### codeSandbox

可以在 codeSandbox 上体验并查看源码。

[![Edit react-live-route-demo-1](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/yj9j33pw4j)

### QR code

你也可以使用移动端设备扫描二维码来体验。

![qr](./qr.png)

## 安装

```bash
npm install react-live-route --save-dev
```

或者

```bash
yarn add react-live-route --dev.
```

## 关于

可以让 Route 在特定路径不匹配的时候隐藏而不被卸载路由的组件，并在路径返回时完全恢复离开路径时的模样。react-live-route 提供了几种 API 来控制组件的隐藏状况。

举个例子：

一个列表页，点击列表页中的项目会进入详情页，当进入详情页时，列表页会在处于详情页中时一直被隐藏，当返回列表页时，列表页会恢复到上一次离开时的模样。

## 特点

- ✅ 完全兼容 react-router-v4，通过了 react-router-v4 的单元测试。
- 🎯 完全恢复上一次离开页面时的模样（包括滚动位置）。
- 🔒 侵入性极小，只需引入一个 LiveRoute。
- ✌️ 简单易懂的 API。

## 须知 ⚠️

- LiveRoute **不能**直接嵌套在 `Switch` 组件中，因为 `Switch` 会只渲染第一个路径匹配的子元素所以 LiveRoute 可能会被直接跳过，你可以将 LiveRoute 从 `Switch` 中移出。
- 如果一个 LiveRoute 的路由在当前路径上被卸载了，那么它也将会被卸载。这是由 React 自顶向下的设计理念决定的，你可以使用 LiveRoute 来声明父路由或者不要嵌套路由。
- 在一些情况下 LiveRoute 的 DOM 将会被直接修改，所以在切换路由时滚动位置将不会改变。这并不是 react-live-route 带来的问题，你可以手动将页面滚动到顶部，这篇 react-router 提供的[教学文章](./scroll-restoration-zh.md)中可以提供一些帮助。另外，如果 LiveRoute 将要恢复滚动位置，由于 React 的渲染顺序，它将发生在 LiveRoute 渲染的组件的滚动操作之后。

## 用法

### livePath

`livePath` 为需要隐藏的页面的路径，具体规则与 react-router 中的 Route 的 `path` props 一样，使用 `component`  或 `render` 来渲染路由对应的组件。

`livePath` 也可以接受一个由上述规则的 string 类型对象组成的数组，如果数组中的任意一个 string 匹配则 `livePath` 匹配。

LiveRoute 会在从 `livePaht` 匹配的路径返回 `path` 匹配的路径时冲渲染，在进入其他不匹配的路径时会直接卸载。

例如：

List 的路由会在 `/list` 下正常渲染，当进入 `/user/:id` 时会隐藏，当进入这两者以外的页面时会正常卸载。

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" livePath="/user/:id" component={List}/>
```

### alwaysLive

`alwaysLive` 和 `livePath` 差不都，区别是路由的组件会在第一次 mount 后在**其他任何路径**都不会再被卸载。

例如：Modal 页面在第一次正常渲染之后，进入路径不匹配的页面时隐藏，而在 Modal 路径匹配时更新渲染。

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" alwaysLive={true} component={Modal}/>
```

### onHide: (routeState: {location, livePath, alwaysLive}) => any

这个钩子函数会在 LiveRoute 将要隐藏时在 `componentWillReceiveProps` 周期触发。

### onReappear: (routeState: {location, livePath, alwaysLive}) => any

这个钩子函数会在 LiveRoute 将要从隐藏状态恢复显示时在 `componentWillReceiveProps` 周期触发。

### forceUnmount (WIP) 🚧

可以传入一个函数，当这个函数返回值为真时，可以强制路由对应的组件卸载，对应的函数签名为

```js
(props, params) => boolean
```

例如：当 user 的 id 为 27 时，List 页对应的组件要卸载掉，而在其他的页面正常渲染。

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" livePath="/user/:id" component={List} forceUnmount={(props, params)=> params.id === 27}/>
```

## Licence

MIT