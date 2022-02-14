import {decode, encode} from 'base-64';
import localStorage from 'react-native-sync-localstorage';
import {EventRegister} from 'react-native-event-listeners';

const initialize = async () => {
  global.addEventListener = EventRegister.addEventListener;
  global.removeEventListener = EventRegister.removeEventListener;
  global.navigator.userAgent = 'ReactNative';

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
};

if (!global.btoa) global.btoa = encode;
if (!global.atob) global.atob = decode;
if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';
if (typeof process === 'undefined') {
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (var p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}
process.browser = false;
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;
if (typeof location === 'undefined')
  global.location = {port: 80, protocol: 'https:'};
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
// process.env['NODE_ENV'] = isDev ? 'development' : 'production';
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}

require('crypto');
initialize();
