const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const Shell = require('node-powershell');
const os = require('os');
const P_TITLE = 'Screenify 📸';
const fetch = require("node-fetch")
const Bluebird = require("bluebird")
fetch.Promise = Bluebird
//initialize a shell instance
const ps = new Shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  vscode.window.setStatusBarMessage(
    `$(device-camera)`
  )
  const htmlPath = path.resolve(context.extensionPath, 'webview/index.html')

  let lastUsedImageUri = vscode.Uri.file(path.resolve(os.homedir(), 'Desktop/code.png'))
  let panel

  vscode.window.registerWebviewPanelSerializer('screenify', {
    async deserializeWebviewPanel(_panel, state) {
      panel = _panel
      panel.webview.html = getHtmlContent(htmlPath)
      panel.webview.postMessage({
        type: 'restore',
        innerHTML: state.innerHTML,
        bgColor: context.globalState.get('screenify.bgColor', '#2e3440')
      })
      const selectionListener = setupSelectionSync()
      panel.onDidDispose(() => {
        selectionListener.dispose()
      })
      setupMessageListeners()
    }
  })

  vscode.commands.registerCommand('screenify.activate', () => {
    vscode.window.showInformationMessage("Screenify is enabled and running, happy shooting 📸 😊 ")
    panel = vscode.window.createWebviewPanel('screenify', P_TITLE, 2, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))]
    })

    panel.webview.html = getHtmlContent(htmlPath)

    const selectionListener = setupSelectionSync()
    panel.onDidDispose(() => {
      selectionListener.dispose()
    })

    setupMessageListeners()

    const fontFamily = vscode.workspace.getConfiguration('editor').fontFamily
    const bgColor = context.globalState.get('screenify.bgColor', '#2e3440')
    panel.webview.postMessage({
      type: 'init',
      fontFamily,
      bgColor
    })

    syncSettings()
  })

  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('screenify') || e.affectsConfiguration('editor')) {
      syncSettings()
    }
  })
  /**
   * 
   * @param {Blob} serializeBlob 
   * @return {Promise} 
   */
  const copySerializedBlobToClipboard = (serializeBlob, isUpload) => {
    const bytes = new Uint8Array(serializeBlob.split(','))
    if (!serializeBlob) return; // returns null
    if (isUpload) return upload(serializeBlob) // upload
    return tempFile(Buffer.from(bytes)) //copy
  }

  /**
   * @param {Blob} serializeBlob 
   * @return {Promise} 
   */
  const writeSerializedBlobToFile = (serializeBlob, fileName) => {
    const bytes = new Uint8Array(serializeBlob.split(','))
    fs.writeFileSync(fileName, Buffer.from(bytes))
  }
  /**
   * @function tempFile
   * @param {String} name 
   * @param {Buffer} data 
   * @return {Promise} 
   */

  function tempFile(data = '') {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(os.tmpdir(), '%temp-screenify', "test_image.png");
      copiedImageUrl = tempPath;
      fs.writeFile(tempPath, data, error_file => {
        if (error_file) return reject(error_file);
        resolve(copiedImageUrl)
      })
    })
  }

  function setupMessageListeners() {
    panel.webview.onDidReceiveMessage(({
      type,
      data
    }) => {
      switch (type) {
        case 'shoot':
          vscode.window
            .showSaveDialog({
              defaultUri: lastUsedImageUri,
              filters: {
                Images: ['png']
              }
            })
            .then(uri => {
              if (uri) {
                writeSerializedBlobToFile(data.serializedBlob, uri.fsPath)
                vscode.window.showInformationMessage("Snippet saved ✅")
                lastUsedImageUri = uri
              }
            })
          break
          /**
           * Copy image to the clipboard
           */
        case 'copy':
          copySerializedBlobToClipboard(data.serializedBlob, data.upload)
            .then(tempPath => {
              if (os.platform() === "win32") {
                ps.addCommand(`Set-Clipboard -LiteralPath ${tempPath}`);
                // TODO:Complete
              } else if (os.platform() === "darwin" || "linux") {
                const {
                  spawnSync
                } = require('child_process');
                // macOS
                if (os.platform() === "darwin") {
                  const childProcess = spawnSync(`cat ${tempPath} pbcopy`)
                } else if (os.platform() === "linux") {
                  const childProcess = spawnSync(`set the clipboard to POSIX file ${tempPath}`);
                }

                childProcess.stdout.on("data", (data) => {
                  vscode.window.showInformationMessage("Snippet copied! 📋 ctrl + V to paste", "Close")


                });

                childProcess.stderr.on("error", (err) => {
                  vscode.window.showErrorMessage(`Ops! Something went wrong! ❌: ${err}`, "Close")

                });
                spawnSync.kill();
              }
              ps.invoke()
                .then(res => {
                  vscode.window.showInformationMessage("Snippet copied! 📋 ctrl + V to paste", "Close")
                })
            })
            .catch(err => {
              ps.dispose()
              vscode.window.showErrorMessage(`Ops! Something went wrong! ❌: ${err}`, "Close")
            })
          break

        case 'getAndUpdateCacheAndSettings':
          panel.webview.postMessage({
            type: 'restoreBgColor',
            bgColor: context.globalState.get('screenify.bgColor', '#2e3440')
          })

          syncSettings()
          break
        case 'updateBgColor':
          context.globalState.update('screenify.bgColor', data.bgColor)
          break
        case 'invalidPasteContent':
          vscode.window.showInformationMessage(
            'Pasted content is invalid. Only copy from VS Code and check if your shortcuts for copy/paste have conflicts.'
          )
          break
      }
    })
  }


  function syncSettings() {
    const settings = vscode.workspace.getConfiguration('screenify')
    const editorSettings = vscode.workspace.getConfiguration('editor', null)
    panel.webview.postMessage({
      type: 'updateSettings',
      shadow: settings.get('shadow'),
      transparentBackground: settings.get('transparentBackground'),
      backgroundColor: settings.get('backgroundColor'),
      target: settings.get('target'),
      ligature: editorSettings.get('fontLigatures')
    })
  }

  function setupSelectionSync() {
    return vscode.window.onDidChangeTextEditorSelection(e => {
      if (e.selections[0] && !e.selections[0].isEmpty) {
        vscode.commands.executeCommand('editor.action.clipboardCopyWithSyntaxHighlightingAction')
        panel.postMessage({
          type: 'update'
        })
      }
    })
  }
}

function getHtmlContent(htmlPath) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  return htmlContent.replace(/script src="([^"]*)"/g, (match, src) => {
    const realSource = 'vscode-resource:' + path.resolve(htmlPath, '..', src)
    return `script src="${realSource}"`
  })
}
const settings = vscode.workspace.getConfiguration('screenify')

/**
 * @function upload
 * @param {Buffer} image 
 * @return {Promise} 
 */

function upload(buffer) {
  let serverUrl = `https://${settings.get("serverUrl")}/api/upload`
  fetch(serverUrl, {
      method: 'POST',
      body: JSON.stringify({
        buffer
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then(res => res.json())
    .then(response => {
      const {
        url
      } = response
      vscode.env.clipboard.writeText(url)
        .then(() => {
          /**
           * TODD:
           *  * send update request to html end
           */
          panel.webview.postMessage({
            "type": "successful",
            url
          })

          vscode.window.showInformationMessage(`Snippet uploaded! ✅    Url is copied to the clipboard 📋: `, url, "Copy")
        })
    })
    .catch(e => {
      vscode.window.showErrorMessage(`Ops! Something went wrong! ❌: ${err}`, "Close")
    });
}

function deactivate() {
  // TODO:complete
  // #1 Clear cache
  // #2 Garbage collecting
  // #3 kill shell process
  ps.stop();
}

exports.activate = activate
exports.deactivate = deactivate