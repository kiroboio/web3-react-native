import './shim.js'; // rn-nodeify shims
import localStorage from 'react-native-sync-localstorage';

const {Crypto} = require('@peculiar/webcrypto');
const EventTarget = require('@ungap/event-target');

const target = new EventTarget();
export default async function initialize(AppState) {
  // crypto
  global.crypto = new Crypto();
  // global.crypto.getRandomValues = args => generateSecureRandom(args.length);
  // localStorage
  await localStorage.getAllFromLocalStorage();
  global.localStorage = localStorage;
  // Event listeners
  global.addEventListener = target.addEventListener;
  global.removeEventListener = target.removeEventListener;
  // sessionStorage
  // https://gist.github.com/juliocesar/926500#gistcomment-1620487
  global.sessionStorage = {
    _data: {},
    setItem: function (id, val) {
      return (this._data[id] = String(val));
    },
    getItem: function (id) {
      return Object.prototype.hasOwnProperty.call(this._data, 'id')
        ? this._data[id]
        : undefined;
    },
    removeItem: function (id) {
      return delete this._data[id];
    },
    clear: function () {
      return (this._data = {});
    },
  };

  // DOMException
  global.DOMException = require('domexception');
}
