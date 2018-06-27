<p align="center">
An enhanced version of react-router-v4 Route that keeps Route component live on unmatched path.

</p>

## ⚠️

NOT FININSHED. STILL WORK IN PROGRESS.

## Document

[中文](./docs/README-zh.md)

## Install

```bash
npm install react-live-route --save-dev
```

## About

可以让 Route 在特定路径不匹配的时候隐藏（live）而不 unmount。

举个例子：

一个列表页，点击列表页中的项目会进入详情页，当进入详情页时，列表页会隐藏，当返回列表页时，列表页会恢复到上一次离开时的模样。

## Features

- 完全兼容 react-router-4
- 侵入性极小，只需引入一个 LiveRoute
- 完全恢复上一次离开页面时的模样
- 超简单的 API

## Usage

### livePath

LiveRoute 需要隐藏的页面的路由，规则与 react-router 的 path 一样。

```jsx
<LiveRoute livePath={} ... />
```

## Licence

MIT