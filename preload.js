const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveImage: (buffer) => ipcRenderer.invoke("save-image-dialog", buffer)
});
