const redux = require('redux');
const nock = require('nock');

const middleware = require('../middleware');

test('it POSTs the dispatched action to the event store', () => {
  const eventStoreMiddleware = middleware('http://0.0.0.0:2113', 'test-stream');
  const store = redux.createStore(
    state => state,
    redux.applyMiddleware(eventStoreMiddleware)
  );

  const eventStream = nock('http://0.0.0.0:2113', {
    reqheaders: {
      Accept: 'application/vnd.eventstore.atom+json',
      'Content-Type': 'application/vnd.eventstore.events+json',
      'Content-Length': '98',
    }})
    .post('/streams/test-stream', body => (
      (body[0].eventId.match(/[0-9a-f-]{36}/) !== null) &&
      (body[0].eventType === 'SOME_ACTION') &&
      (body[0].data.amount === 7)
    ))
    .reply(201);

  store.dispatch({ type: 'SOME_ACTION', amount: 7 });

  expect(eventStream.isDone()).toBe(true);
});
