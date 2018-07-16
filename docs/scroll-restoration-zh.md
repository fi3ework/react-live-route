# 滚动恢复

在早期的 React Router 版本中我们提供了开箱即用的滚动恢复解决方案但是一直有人在询问关于它的问题。希望这篇文章可以让你得到一些关于滚动条和路由的帮助！

浏览器已经开始通过 `history.pushState` 来处理滚动的恢复了，并且在 Chrome 中已经有了很不错的实现。这是[恢复滚动的规范](https://majido.github.io/scroll-restoration-proposal/history-based-api.html#web-idl)。

因为浏览器已经开始处理"默认情况"，而且实际在开发中面对的情况有很多，所以我们不再提供默认的滚动管理，不过这篇文章将会给你想要的一些关于滚动的帮助。

## 滚回顶部

在页面有很长的内容时，大多数情况下我们需要的只是"滚回顶部"，因为当导航过去时，还处于滚动到下面的状态。这可以直接使用 `<ScrollToTop>` 组件来解决，它会在每次导航时都放回到页面顶部，要确保将他包裹在 `withRouter` 中来提供给他 router 的 props：

```jsx
class ScrollToTop extends Component {
  componentDidUpdate(prevProps) {
    if (this.props.location !== prevProps.location) {
      window.scrollTo(0, 0)
    }
  }

  render() {
    return this.props.children
  }
}

export default withRouter(ScrollToTop)
```

然后将它放在整个应用的顶部，但是在 Route 的下面

```jsx
const App = () => (
  <Router>
    <ScrollToTop>
      <App/>
    </ScrollToTop>
  </Router>
)

// or just render it bare anywhere you want, but just one :)
<ScrollToTop/>
```

如果你的路由中有一个选项页，那么也许你不希望在每次导航时都回到顶部。相反你可以将 `<ScrollToTopOnMount>` 使用在特定的组件上。

```jsx
class ScrollToTopOnMount extends Component {
  componentDidMount() {
    window.scrollTo(0, 0)
  }

  render() {
    return null
  }
}

class LongContent extends Component {
  render() {
    <div>
      <ScrollToTopOnMount/>
      <h1>Here is my long content page</h1>
    </div>
  }
}

// somewhere else
<Route path="/long-content" component={LongContent}/>
```

## 通用解决方案

一个更通用的解决方案（也是浏览器们正在原生实现的）是我们需要做到以下两点：

1. 当导航到一个新页面时自动滚到顶部。
2. 当点击"后退"和"前进"按钮时，恢复滚动。

之前我们曾经想提供一个通用的 API，这是我们想到的调用方法：

```jsx
<Router>
  <ScrollRestoration>
    <div>
      <h1>App</h1>

      <RestoredScroll id="bunny">
        <div style={{ height: '200px', overflow: 'auto' }}>
          I will overflow
        </div>
      </RestoredScroll>
    </div>
  </ScrollRestoration>
</Router>
```

首先，`ScrollRestoration` 将页面滚到顶部。其次，它将使用 `location.key` 来保存窗口的滚动位置和 `RestoredScroll` 的局部滚动位置并存入 `sessionStorage` 中。其次，当 `ScrollRestoration` 或 `RestoredScroll` 组件 mount 时，他们将查找 `sessionStorage` 中的滚动位置。

不过棘手的问题是如何定义一个"退出管理" 的 API 当我不再想管理的窗口的滚动位置时。举个例子，当你页面的内容中有一些浮动的标签页时你也许不想再滚动到顶部（因为标签将会脱离窗口区域！）

当我发现 Chrome 开始为我们管理滚动位置，并且意识到不同的应用将会有很多种滚动管理的需求。我认为我们不需要再提供一些特定的功能 —— 尤其是大部分的需求只是滚动到顶部（就像你看到的只需要直接添加在你的应用中即可）。

基于此，我们不觉得有必要再做这些工作了（我们都时间有限）。但是我们会帮助那些希望做出通用解决方案的人，如果真的有成熟的解决方案我们也会将它放在这个项目中。如果你已经开始动手了，告诉我们吧 :)