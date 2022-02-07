import './shim.js'; // rn-nodeify shims
import localStorage from 'react-native-sync-localstorage';
import { EventRegister } from 'react-native-event-listeners'

export default async function initialize() {

  global.addEventListener = EventRegister.addEventListener;
  global.removeEventListener = EventRegister.removeEventListener;
  global.navigator.userAgent = 'ReactNative'

  await localStorage.getAllFromLocalStorage();
  global.localStorage = localStorage;
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

  global.DOMException = require('domexception');
}
