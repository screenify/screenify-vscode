const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const Shell = require('node-powershell');
const os = require('os');
const cloudinary = require('cloudinary');

const P_TITLE = 'Screenify 📸';

//initialize a shell instance
const ps = new Shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
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
    if (isUpload) return upload(Buffer.from(bytes)) // upload
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

        case 'copy':
          // upload image
          if (data.upload) {
            copySerializedBlobToClipboard(data.serializedBlob, data.upload)
              .then(url => {
                vscode.env.clipboard.writeText(url).then((text) => {
                  clipboard_content = url;
                  vscode.window.showInformationMessage("Snippet uploaded! ✅    Url is copied to the clipboard 📋:", url)
                });
              }).catch(e => {
                vscode.window.showErrorMessage("Ops! Something went wrong! ❌", err)
              })
          } else {
            // copy image
            copySerializedBlobToClipboard(data.serializedBlob)
              .then(tempPath => {
                if (os.platform() === "win32") {
                  ps.addCommand(`Set-Clipboard -LiteralPath ${tempPath}`);
                  // TODO:Complete
                } else if (os.platform() === "darwin" || "linux") {
                  const {
                    spawnSync
                  } = require('child_process');

                  if (os.platform() === "darwin") {
                    const childProcess = spawnSync(`set the clipboard to POSIX file ${tempPath}`)
                  } else if (os.platform() === "linux") {
                    const childProcess = spawnSync(`set the clipboard to POSIX file ${tempPath}`);
                  }

                  childProcess.stdout.on("data", (data) => {
                    vscode.window.showInformationMessage("Snippet copied! 📋 cmd + V to paste")

                  });

                  childProcess.stderr.on("error", (err) => {
                    vscode.window.showErrorMessage("Ops! Something went wrong! ❌", err)
                  });
                  spawnSync.kill();
                }
                ps.invoke()
                  .then(res => {
                    vscode.window.showInformationMessage("Snippet copied! 📋 ctrl + V to paste")
                  })
              })
              .catch(err => {
                ps.dispose()
                vscode.window.showErrorMessage("Ops! Something went wrong! ❌", err)
              })
          }
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

cloudinary.config({
  cloud_name: "du4wwde3u",
  api_key: "311596162754573",
  api_secret: "hPq0pncqyavOiKv2jmkThOajZp0"
});
/**
 * @function upload
 * @param {Buffer} image 
 * @return {Promise} 
 */
function upload(image) {
  return new Promise((resolve, reject) => {
    let content = image.toString('base64');

    try {
      cloudinary.v2.uploader.upload(`data:image/png;base64,${content}`, {
        folder: '/screenfiy/uploads',
        fetch_format: 'auto',
        quality: 'auto'
      }, (error, result) => {
        if (error) {
          vscode.window.showWarningMessage(error.message);
          reject(error);
        } else {
          console.log(result);
          resolve(result.secure_url);
        }
      });
    } catch (e) {
      vscode.window.showWarningMessage(e);
    }
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