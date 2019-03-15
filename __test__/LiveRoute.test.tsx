import * as React from 'react'
import LiveRoute from '../src/index'
import { Route, Link, Switch, Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { render, fireEvent, cleanup } from 'react-testing-library'

const textGenerator = (name: string) => `🚥, ROUTE OF _${name}_`

const LinkGenerator = ({ to }) => (
  <Link to={`/${to}`} id={`to${to.toUpperCase()}`} data-testid={`to${to.toUpperCase()}`}>
    {`link_to_${to}`}
  </Link>
)

const componentGenerator = (name: string) =>
  class ClassComA extends React.Component {
    render() {
      return <h1>{textGenerator(name)}</h1>
    }
  }

function App() {
  return (
    <div>
      <LiveRoute path="/a" livePath="/b" component={componentGenerator('live-on-b')} />
      <LiveRoute path="/a" livePath={['/b', '/c']} component={componentGenerator(`live-on-bc`)} />
      <LiveRoute path="/a" alwaysLive={true} component={componentGenerator('always-live')} />
      <Route path="/b" render={() => <h1>{textGenerator('b')}</h1>} />
      <Route path="/c" render={() => <h1>{textGenerator('c')}</h1>} />
      <LinkGenerator to="a" />
      <LinkGenerator to="b" />
      <LinkGenerator to="c" />
    </div>
  )
}

// automatically unmount and cleanup DOM after the test is finished.
afterEach(cleanup)

// this is a handy function that I would utilize for any component
// that relies on the router being in context
function renderWithRouter(ui, { route = '/', history = createMemoryHistory({ initialEntries: [route] }) } = {}) {
  return {
    ...render(<Router history={history}>{ui}</Router>),
    // adding `history` to the returned utilities to allow us
    // to reference it in our tests (just try to avoid using
    // this to test implementation details).
    history
  }
}

function routesLives(container: HTMLElement, yesOrNot: 'yes' | 'not', expectLives: string[]) {
  const judger = yesOrNot === 'yes' ? expect(container.innerHTML) : expect(container.innerHTML).not
  expectLives.forEach(route => {
    judger.toContain(`${textGenerator(route)}`)
  })
}

test('live route through different urls', () => {
  const leftClick = { button: 0 }

  const { container, getByTestId } = renderWithRouter(<App />)
  routesLives(container, 'not', ['live-on-b', `live-on-bc`, 'always-live', 'b', 'c'])

  fireEvent.click(getByTestId('toA'), leftClick)
  routesLives(container, 'yes', ['live-on-b', `live-on-bc`, 'always-live'])
  routesLives(container, 'not', ['b', 'c'])

  fireEvent.click(getByTestId('toB'), leftClick)
  routesLives(container, 'yes', ['live-on-b', `live-on-bc`, 'always-live', 'b'])
  routesLives(container, 'not', ['c'])

  fireEvent.click(getByTestId('toC'), leftClick)
  routesLives(container, 'yes', [`live-on-bc`, 'always-live', 'c'])
  routesLives(container, 'not', ['live-on-b', 'b'])
})
