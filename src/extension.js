    /*---------------------------------------------------------------------------------------------
     * Copyright(c) Screenify📸.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/

    const vscode = require('vscode'),
      fs = require('fs'),
      path = require('path'),
      Shell = require('node-powershell'),
      os = require('os'),
      P_TITLE = 'Screenify 📸',
      fetch = require("node-fetch"),
      Bluebird = require("bluebird"),
      {
        copyImg
      } = require('img-clipboard');
    fetch.Promise = Bluebird


    /**
     * @param {vscode.ExtensionContext} context
     */
    function activate(context) {
      const {
        subscriptions
      } = context

      /** Status Bar configuration **/
      statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
      statusBarItem.command = "screenify.activate"
      statusBarItem.text = `$(device-camera) Screenify`
      statusBarItem.tooltip = "Capture Code Snippet"
      statusBarItem.show()
      subscriptions.push(statusBarItem);

      class HelpDataProvider {
        constructor() {
          this.data = [
            new TreeItem("Give me your feedback", "twitter.svg", "https://twitter.com/adammuman81"),
            new TreeItem("Report an issue", "github.png", "https://github.com/AdamMomen/screenify-vscode/issues"),
            new TreeItem("More Info", "question.png", "../README.md"),
            new TreeItem("Support", "icon-heart.svg", "https://www.patreon.com/adammomen")
          ];
        }
        getTreeItem(element) {
          return element;
        }

        getChildren(element = undefined) {
          if (element === undefined) {
            return this.data;
          }
          return element.children;
        }
      }
      class GettingStartedDataProvider {
        constructor() {
          this.data = [
            new TreeItem("Start Screenify 📸", "", "", {
              title: "Start Screenify",
              command: "screenify.activate",
              context: "start"
            }),
          ];
        }
        getTreeItem(element) {
          return element;
        }

        getChildren(element = undefined) {
          if (element === undefined) {
            return this.data;
          }
          return element.children;
        }
      }
      class TreeItem extends vscode.TreeItem {

        constructor(label, icon, uri,
          cmd = {
            title: "Open Uri",
            command: "help.openUri",
            context: "openUrl"
          }) {
          super(label, vscode.TreeItemCollapsibleState.None);
          this.iconPath = path.join(context.extensionPath, 'resources', icon);
          this.command = {
            title: cmd.title,
            command: cmd.command,
            arguments: [uri]
          }
          this._uri = uri;
          this.contextValue = cmd.context
        }
      }

      vscode.window.registerTreeDataProvider('help', new HelpDataProvider());
      vscode.window.registerTreeDataProvider('gettingStarted', new GettingStartedDataProvider());
      vscode.commands.registerCommand('help.openUri', node => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(node));
      });

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
       * Copyies serial blob to the clipboard or uploads the blob to CDN uploaders
       * @param {Blob} serializedBlobHandler 
       * @return {Promise} 
       */
      function serializedBlobHandler(serializeBlob, isUpload) {
        if (!serializeBlob) return; // returns null
        const bytes = new Uint8Array(serializeBlob.split(','))
        if (isUpload) return upload(serializeBlob) // upload
        return copyImg(Buffer.from(bytes));
      }


      /**
       * Saves blob to into file
       * @param {Blob} serializeBlob 
       * @return {Promise} 
       */
      function writeSerializedBlobToFile(serializeBlob, fileName) {
        const bytes = new Uint8Array(serializeBlob.split(','))
        fs.writeFileSync(fileName, Buffer.from(bytes))
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
              serializedBlobHandler(data.serializedBlob, data.upload)
                .then(() => {
                  vscode.window.showInformationMessage("Snippet copied! 📋 ctrl + V to paste", "Close")
                })
                .catch(err => {
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

      /**
       * @function upload
       * @param {Buffer} image 
       * @return {Promise} 
       */
      function upload(buffer) {
        let serverUrl = `https://${settings.get("serverUrl")}/api/upload`

        vscode.window.withProgress({
            location: 15,
            title: "Uploading Image...",

          }, (progress, token) => {
            token.onCancellationRequested(() => {
              return;
            });
            return fetch(serverUrl, {
              method: 'POST',
              body: JSON.stringify({
                buffer
              }),
              headers: {
                'Content-Type': 'application/json',
              }
            })
          })

          .then(res => res.json())
          .then(response => {
            const {
              url
            } = response
            vscode.env.clipboard.writeText(url)
              .then(() => {
                panel.webview.postMessage({
                  type: 'successfulUplaod',
                  url
                })
                vscode.window.showInformationMessage(`Snippet uploaded! ✅    Url is copied to the clipboard 📋: `, url, "Copy")
              })
          })
          .catch(err => {
            vscode.window.showErrorMessage(`Ops! Something went wrong! ❌: ${err}`, "Close")
          });
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


    function deactivate() {
      // TODO:complete
      // #1 Clear cache
      // #2 Garbage collection
    }

    exports.activate = activate
    exports.deactivate = deactivate