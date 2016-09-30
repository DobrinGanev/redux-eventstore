import { createStore } from 'redux';
import nock from 'nock';
import subscribeToStream from '../subscribeToStream';

test('it throws an error when host is not valid', () => {
  expect(() => subscribeToStream(null, 'test-stream', () => {})).toThrowError(/Invalid host/);
  expect(() => subscribeToStream({}, 'test-stream', () => {})).toThrowError(/Invalid host/);
  expect(() => subscribeToStream('', 'test-stream', () => {})).toThrowError(/Invalid host/);
});

test('it throws an error when stream name is invalid', () => {
  expect(() => subscribeToStream('localhost', {}, () => {})).toThrowError(/Invalid stream/);
  expect(() => subscribeToStream('localhost', null, () => {})).toThrowError(/Invalid stream/);
  expect(() => subscribeToStream('localhost', '', () => {})).toThrowError(/Invalid stream/);
});

test('it throws an error when dispatch is invalid', () => {
  expect(() => subscribeToStream('localhost', 'test-stream', {})).toThrowError(/Invalid dispatch/);
  expect(() => subscribeToStream('localhost', 'test-stream', null)).toThrowError(/Invalid dispatch/);
  expect(() => subscribeToStream('localhost', 'test-stream', 'function')).toThrowError(/Invalid dispatch/);
});

test('it throws an error when pollPeriod is invalid', () => {
  expect(() => subscribeToStream('localhost', 'test-stream', () => {}, null)).toThrowError(/Invalid pollPeriod/);
  expect(() => subscribeToStream('localhost', 'test-stream', () => {}, {})).toThrowError(/Invalid pollPeriod/);
  expect(() => subscribeToStream('localhost', 'test-stream', () => {}, 'one')).toThrowError(/Invalid pollPeriod/);
});

const testReducer = (state = 0, event) => {
  switch(event.type) {
    case 'ADD':
      return state + event.amount;
    case 'MULTIPLY':
      return state * event.amount;
    default:
      return state;
  }
};

test('it reads the events off the stream and dispatches them, in order', () => {
  const store = createStore(testReducer);

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
      nock.restore();
      expect(store.getState()).toBe(15);
      resolve();
    }, 100);
  });
});
