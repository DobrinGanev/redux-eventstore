'use strict';

const redux = require('redux');
const nock = require('nock');
const subscribeToStream = require('../subscribeToStream');

test('reads the events off the stream and dispatches them, in order', () => {
  const rootReducer = (state = 0, event) => {
    switch(event.type) {
      case 'ADD':
        return state + event.amount;
      case 'MULTIPLY':
        return state * event.amount;
      default:
        return state;
    }
  };

  const store = redux.createStore(rootReducer);

  nock('http://0.0.0.0:2113', { reqheaders: { Accept: 'application/vnd.eventstore.atom+json' }})
    .persist()
    .get('/streams/test-stream/0')
      .reply(200, { content: { eventType: 'ADD', data: { amount: 3 } } })
    .get('/streams/test-stream/1')
      .reply(200, { content: { eventType: 'MULTIPLY', data: { amount: 5 } } })
    .get('/streams/test-stream/2')
      .reply(404);

  subscribeToStream('http://0.0.0.0:2113', 'test-stream', store.dispatch);

  // Ugly race condition test :/
  return new Promise(resolve => {
    setTimeout(() => {
      expect(store.getState()).toBe(15);
      resolve();
    }, 100);
  });
});
