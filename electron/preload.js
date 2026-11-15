const { contextBridge } = require('electron')
contextBridge.exposeInMainWorld('ascent', { version: '1.0.0' })