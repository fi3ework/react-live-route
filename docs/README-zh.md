<p align="center">
对 react-router-v4 Route 组件的加强版，能够让路由在路径不匹配时隐藏而不卸载。

</p>

## 文档

[English](./docs/README-zh.md)

## 安装

```bash
npm install react-live-route --save-dev
```

## 关于

可以让 Route 在特定路径不匹配的时候隐藏（live）而不 unmount。

举个例子：

一个列表页，点击列表页中的项目会进入详情页，当进入详情页时，列表页会隐藏，当返回列表页时，列表页会恢复到上一次离开时的模样。

## 特点

- 完全兼容 react-router-v4，通过了 react-router-v4 的单元测试
- 侵入性极小，只需引入一个 LiveRoute
- 完全恢复上一次离开页面时的模样（包括滚动位置）
- 简单易懂的 API

## API

### livePath

livePath 为需要隐藏的页面的路由，具体规则与 react-router 中的 Route 的 path props 一样。

例如：List 的路由会在 `/list` 下正常渲染，当进入 `/user/:id` 时会隐藏，当进入这两者以外的页面时会正常卸载。

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" livePath="/user/:id" component={List}/>
```

### alwaysLive

AlwaysLive 会在路由对应的组件完成第一次初始化后，在其他不匹配的页面下阻止页面的卸载。

例如：Modal 页面在第一次正常渲染之后，进入路径不匹配的页面时隐藏，而在 Modal 页面正常的更新渲染。

```jsx
import LiveRoute from 'react-live-route'

<LiveRoute path="/list" alwaysLive={true} component={Modal}/>
```

### forceUnmount

🚸 WIP

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